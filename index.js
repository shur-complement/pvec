/**
 * A Persistent Vector inspired by Clojure's implementation.
 * https://github.com/clojure/clojure/blob/master/src/jvm/clojure/lang/APersistentVector.java
 */

const SHIFT = 5;
const BRANCHING_FACTOR = 1 << SHIFT;
const MASK = BRANCHING_FACTOR - 1;
const LOWER_BOUND = 33;
const UPPER_BOUND = 64;

/**
 * Iterable Iterator for `PVec`.
 */
class PVecIterator {
  /** @type{number} */
  #size;

  /** @type{any[]} */
  #tail;

  /** @type {any[][]} */
  #stack;

  /** @type {any} */
  #leaf;

  /** @type {number} */
  #index;

  /** @type {number} */
  #jump;

  /**
   * @param {number} size
   * @param {number} shift
   * @param {any[]} root
   * @param {any[]} tail
   */
  constructor(size, shift, root, tail) {
    this.#index = 0;
    this.#size = size;
    this.#tail = tail;
    this.#jump = BRANCHING_FACTOR;
    this.done = false;
    this.#stack = new Array(shift / SHIFT).fill([]);

    if (size <= BRANCHING_FACTOR) this.#leaf = tail;
    else if (size <= UPPER_BOUND) this.#leaf = root;
    else {
      this.#stack[this.#stack.length - 1] = root;
      for (let i = this.#stack.length - 2; i >= 0; i--) {
        this.#stack[i] = this.#stack[i + 1][0];
      }
      this.#leaf = this.#stack[0][0];
    }
  }

  next() {
    if (this.#index === this.#size) {
      return {
        done: true,
        value: undefined,
      };
    }
    if (this.#index === this.#jump) {
      if (this.#index >= ((this.#size - 1) & (~MASK))) {
        this.#leaf = this.#tail;
      } else {
        this.#jump += BRANCHING_FACTOR;
        const diff = this.#index ^ (this.#index - 1);
        let level = (2 * SHIFT);
        let stackUpdates = 0;
        while ((diff >>> level) !== 0) {
          stackUpdates++;
          level += SHIFT;
        }
        level -= SHIFT;
        while (stackUpdates > 0) {
          this.#stack[stackUpdates - 1] = this.#stack[stackUpdates][(this.#index >>> level) & MASK];
          stackUpdates--;
          level -= SHIFT;
        }
        this.#leaf = this.#stack[0][(this.#index >>> SHIFT) & MASK];
      }
    }
    const value = this.#leaf[this.#index++ & MASK];
    return {
      done: false,
      value,
    };
  }

  [Symbol.iterator]() {
    return this;
  }
}

/**
 * Persistent Vector
 * Provides sequential iteration and log(N) random access with non-destructive updates.
 * Heavily inspired by Clojure's PersistentVector
 */
class PVec {
  /** @type {number} */
  #size;

  /** @type {number} */
  #shift;

  /** @type {any[]} */
  #tail;

  /** @type {any[]} */
  #root;

  /** statically shared instance of empty PVec */
  static #EMPTY_VEC = new PVec(0, 0, [], []);

  /**
   * @param {number} size
   * @param {number} shift
   * @param {any[]} root
   * @param {any[]} tail
   */
  constructor(size, shift, root, tail) {
    this.#size = size;
    this.#shift = shift;
    this.#tail = tail;
    this.#root = root;
  }

  /**
   * Construct a new, empty PVec.
   * @returns {PVec}
   */
  static empty() {
    return PVec.#EMPTY_VEC;
  }

  /**
   * Constructs a PVec from any iterable
   * @param {Iterable} xs
   * @returns {PVec}
   */
  static from(xs) {
    let p = PVec.empty();
    for (const elem of xs) {
      p = p.push(elem);
    }
    return p;
  }

  /**
   * Gets the value at the `i`th index.
   * Throws if index is out of bounds.
   * @param {number} i
   * @returns {any}
   */
  get(i) {
    this.#boundsCheck(i);
    if (i >= this.#tailOffset()) {
      return this.#tail[i & MASK];
    }
    let node = this.#root;
    for (let level = this.#shift; level > 0; level -= SHIFT) {
      node = node[(i >>> level) & MASK];
    }
    return node[i & MASK];
  }

  /**
   * Sets the value at the `i`th index to `val`.
   * Returns a new PVec without modifying the original.
   * @param {number} i
   * @param {any} val
   * @returns {PVec}
   */
  set(i, val) {
    this.#boundsCheck(i);
    if (i >= this.#tailOffset()) {
      const newTail = [...this.#tail];
      newTail[i & MASK] = val;
      return new PVec(this.#size, this.#shift, this.#root, newTail);
    }
    const newRoot = [...this.#root];
    let node = newRoot;
    for (let level = this.#shift; level > 0; level -= SHIFT) {
      const subidx = (i >>> level) & MASK;
      let child = node[subidx];
      child = [...child];
      node[subidx] = child;
      node = child;
    }
    node[i & MASK] = val;
    return new PVec(this.#size, this.#shift, newRoot, this.#tail);
  }

  /**
   * Get the last element, if it exists.
   * otherwise returns `null`
   * @returns {?any}
   */
  peek() {
    if (this.#size > 0) { return this.get(this.#size - 1); }
    return null;
  }

  /**
   * Appends a new value to the end of the PVec.
   * Returns a new PVec without modifying the original.
   * @param {any} val
   * @returns {PVec}
   */
  push(val) {
    const ts = this.#tailSize();
    if (ts !== BRANCHING_FACTOR) {
      const newTail = [...this.#tail];
      newTail.push(val);
      return new PVec(this.#size + 1, this.#shift, this.#root, newTail);
    }

    const newTail = [val];
    if (this.#size === BRANCHING_FACTOR) {
      return new PVec(this.#size + 1, 0, this.#tail, newTail);
    }

    let newRoot;
    let newShift = this.#shift;
    if ((this.#size >>> SHIFT) > (1 << this.#shift)) {
      newShift += SHIFT;
      newRoot = new Array(BRANCHING_FACTOR);
      newRoot[0] = this.#root;
      newRoot[1] = PVec.#newPath(this.#shift, this.#tail);
      return new PVec(this.#size + 1, newShift, newRoot, newTail);
    }
    newRoot = PVec.#pushLeaf(this.#shift, this.#size - 1, this.#root, this.#tail);
    return new PVec(this.#size + 1, this.#shift, newRoot, newTail);
  }

  /**
   * Returns a new PVec without the last element.
   * @returns {PVec}
   */
  pop() {
    if (this.#size === 0) {
      throw new Error("Can't pop empty PVec");
    }
    if (this.#size === 1) {
      return PVec.empty();
    }
    if (((this.#size - 1) & MASK) > 0) {
      const newTail = this.#tail.slice(0, this.#tail.length - 1);
      return new PVec(this.#size - 1, this.#shift, this.#root, newTail);
    }
    const newTrieSize = this.#size - LOWER_BOUND;
    if (newTrieSize === 0) {
      return new PVec(BRANCHING_FACTOR, 0, [], this.#root);
    }
    // check if we can reduce the trie's height
    if (newTrieSize === 1 << this.#shift) { // can lower the height
      return this.#lowerTrie();
    }
    return this.#popTrie();
  }

  /**
   * Concatenate this PVec with an iterable sequence
   * @param {Iterable} other
   * @returns
   */
  concat(other) {
    let p = this;
    for (const x of other) {
      p = p.push(x);
    }
    return p;
  }

  /**
   * Returns true if collection is empty
   * otherwise false
   * @returns {boolean}
   */
  isEmpty() {
    return this.#size === 0;
  }

  /**
     * returns the size of the PVec
     */
  size() {
    return this.#size;
  }

  [Symbol.iterator]() {
    return new PVecIterator(this.#size, this.#shift, this.#root, this.#tail);
  }

  /**
   * Apply a transformation to each element of PVec
   * Returns a new PVec with the transformation applied
   * @param {(any) => any} f 
   * @returns {PVec}
   */
  map(f) {
    let p = PVec.empty();
    for (const x of this) {
      p = p.push(f(x));
    }
    return p;
  }

  /**
   * Apply a reduction to the vec.
   * @param {(acc: any, item: any) => any} f - a binary operation
   * @param {any} init - initial value
   * @returns {PVec}
   */
  reduce(f, init) {
    let acc = init;
    for (const x of this) {
      acc = f(acc, x);
    }
    return acc;
  }

  /**
   * 
   * @param {(any) => boolean} predicate
   * @returns {PVec}
   */
  filter(predicate) {
    return this.reduce(
      (acc, x) => predicate(x) ? acc.push(x) : acc,
      PVec.empty()
    );
  }

  /**
   * @param {PVec} other 
   */
  isEqualTo(other) {
    if (this.size() != other.size()) {
      return false;
    }
    for (let i = 0; i < this.size(); i++) {
      if (this.get(i) !== other.get(i)) {
        return false;
      }
    }
    return true;
  }

  toArray() {
    const out = []
    for (const x of this) {
      out.push(x);
    }
    return out;
  }

  toString() {
    const out = [];
    for (const x of this) {
      out.push(x.toString());
    }
    const buf = out.join(',');
    return `[${buf}]`;
  }

  /**
   * @param {number} shift
   * @param {number} i
   * @param {any[]} root
   * @param {any[]} tail
   * @returns
   */
  static #pushLeaf(shift, i, root, tail) {
    const newRoot = [...root];
    let node = newRoot;
    for (let level = shift; level > SHIFT; level -= SHIFT) {
      const subidx = (i >>> level) & MASK;
      let child = node[subidx];
      if (child === null) {
        node[subidx] = PVec.#newPath(level - SHIFT, tail);
        return newRoot;
      }
      child = [...child];
      node[subidx] = child;
      node = child;
    }
    node[(i >>> SHIFT) & MASK] = tail;
    return newRoot;
  }

  /**
   * @param {number} levels
   * @param {any[]} tail
   * @returns {any[]}
   */
  static #newPath(levels, tail) {
    let topNode = tail;
    for (let level = levels; level > 0; level -= SHIFT) {
      const newTop = Array(BRANCHING_FACTOR);
      newTop[0] = topNode;
      topNode = newTop;
    }
    return topNode;
  }

  /**
   * @returns {PVec}
   */
  #lowerTrie() {
    const lowerShift = this.#shift - SHIFT;
    const newRoot = this.#root[0];
    let node = this.#root[1];
    for (let level = lowerShift; level > 0; level -= SHIFT) {
      node = node[0];
    }
    return new PVec(this.#size - 1, lowerShift, newRoot, node);
  }

  /**
     * @returns {PVec}
     */
  #popTrie() {
    const newTrieSize = this.#size - LOWER_BOUND;
    const diverges = newTrieSize ^ (newTrieSize - 1);
    let hasDiverged = false;
    const newRoot = [...this.#root];
    let node = newRoot;
    for (let level = this.#shift; level > 0; level -= SHIFT) {
      const subIndex = (newTrieSize >>> level) & MASK;
      let child = node[subIndex];
      if (hasDiverged) {
        node = child;
      } else if ((diverges >>> level) != 0) {
        hasDiverged = true;
        node[subIndex] = null;
        node = child;
      } else {
        child = [...child];
        node[subIndex] = child;
        node = child;
      }
    }
    return new PVec(this.#size - 1, this.#shift, newRoot, node);
  }

  /**
     * Asserts that index is within bounds.
     * @param {number} index
     */
  #boundsCheck(index) {
    if (index >= this.#size || index < 0) { throw new Error(`index ${index} out of bounds`); }
  }

  /**
     *
     * @returns {number}
     */
  #tailOffset() {
    return (this.#size - 1) & (~MASK);
  }

  #tailSize() {
    return (this.#size === 0) ? 0 : ((this.#size - 1) & MASK) + 1;
  }
}

module.exports = PVec;