# PVec

_Disclaimer: This is a WORK IN PROGRESS. The author is still ironing out any latent bugs_.

A persistent vector implementation in JavaScript. Similar to Array, but immutable.

This implementation is inspired by Clojure's [`PersistentVector`](https://github.com/clojure/clojure/blob/master/src/jvm/clojure/lang/APersistentVector.java)
and [hyPiRion's blog series](https://hypirion.com/musings/understanding-persistent-vector-pt-1).

Supports O(log32 N) random access, non-destructive updates, and a functional API.

# Example

```js
const PVec = require("./pvec");

const v = PVec.empty().push(1).push(2).push(3).push(4).push(5);
const v2 = v.concat(PVec.from([6,7,8]));

assert(v2.isEqualTo(PVec.from([1,2,3,4,5,6,7,8])));

console.log(v2.reduce((acc, x) => acc + x, 0));
console.log(v2.map((x) => x + 1).toArray());
```
