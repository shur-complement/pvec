const assert = require('assert');
const PVec = require('../index');
describe('PVec', () => {

  describe('#push()', () => {

    it('should add an element to the vec', () => {
      const v = PVec.empty().push(1);
      assert.equal(v.size(), 1);
    });

    it('should support chaining', () => {
      const v = PVec.empty().push(1).push(2).push(3);
      assert.equal(v.size(), 3);
    });

  });

  describe('#pop()', () => {
    it('should remove the last element', () => {
      const v = PVec.from([1, 2, 3]).pop();
      assert.equal(v.size(), 2);
      assert.equal(v.get(1), 2);
    });

    it('should throw when collection is empty', () => {
      assert.throws(() => PVec.empty().pop());
    })
  });

  describe('#peek()', () => {
    it('should return the last element', () => {
      const v = PVec.from([1,2,3,4,5]);
      assert.equal(v.peek(), 5);
    });
    it ('should return null if vec is empty', () => {
      assert.equal(PVec.empty().peek(), null);
    });
  });

  describe('#get()', () => {

    it('supports random access reads', () => {
      const v = PVec.from([1, 2, 3]);
      assert.equal(v.get(0), 1);
      assert.equal(v.get(1), 2);
      assert.equal(v.get(2), 3);
    });

    it('throws when out of bounds', () => {
      const v = PVec.empty();
      assert.throws(() => v.get(0));
      assert.throws(() => v.get(99));
      assert.throws(() => v.get(-1));
    });

  });

  describe('#set()', () => {

    it('supports random access writes', () => {
      const v = PVec.from([0, 0, 0]).set(0, 99).set(1, 98).set(2, 97);
      assert.equal(v.get(0), 99);
      assert.equal(v.get(1), 98);
      assert.equal(v.get(2), 97);
    });

    it('throws when out of bounds', () => {
      assert.throws(() => PVec.from([0, 0, 0]).set(1000, 1));
      assert.throws(() => PVec.empty().set(1000, 1));
      assert.throws(() => PVec.from([0, 0, 0]).set(-1, 100));
    });

  });

  describe('#isEqualTo', () => {
    it('supports testing equality between vecs', () => {
      assert.equal(
        PVec.empty().isEqualTo(PVec.from([])),
        true
      );

      assert.equal(
        PVec.from([1,2,3]).isEqualTo(PVec.empty().push(1).push(2).push(3)),
        true
      );

      assert.equal(
        PVec.from([1]).isEqualTo(PVec.empty()),
        false
      );
    })
  })

  describe('#concat()', () => {
    it ('supports concatenating a vec with an iterable', () => {
      assert.equal(
        PVec.from([1,2,3])
          .concat(PVec.from([4,5,6]))
          .isEqualTo(PVec.from([1,2,3,4,5,6])),
        true,
      );
    })
  });

  describe('#size()', () => {
    it('returns the number of elements', () => {
      assert.equal(PVec.empty().size(), 0);
      assert.equal(PVec.from([1,2,3]).size(), 3);
    })
  })

  describe('#toArray()', () => {
    it ('supports conversion to Array', () => {
      const v = PVec.empty().push(1).push(2).pop().push(99).concat(PVec.from([1,2,3]));
      assert.deepStrictEqual(v.toArray(), [1,99,1,2,3]);
      assert.deepStrictEqual(PVec.empty().toArray(), []);
    })
  });

  describe('#map()', () => {
    it ('supports linear transforms', () => {
      const v = PVec.from([1,2,3]).map((x) => x + 1);
      assert.deepStrictEqual(v.toArray(), [2,3,4]);
    });

    it ('does nothing to empty sequences', () => {
      const v = PVec.empty().map((x) => 'foo!');
      assert.equal(v.isEmpty(), true);
    });

  });

  describe('#reduce()', () => {
    it ('supports reductions', () => {
      const v = PVec.from([1,2,3]);
      const s = v.reduce((acc, x) => acc + x, 0);
      assert.equal(s, 6);
    });

    it ('returns initial value when vec is empty', () => {
      const s = PVec.empty().reduce((acc, x) => acc + x, 99999);
      assert.equal(s, 99999);
    })
  });

  describe('#filter()', () => {
    it ('filters vec', () => {
      const v = PVec.from([1,2,3]).filter((x) => x % 2 !== 0);
      assert.deepStrictEqual(v.toArray(), [1,3]);
    });
  });

});