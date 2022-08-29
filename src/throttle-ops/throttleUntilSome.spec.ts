import { delay, interval, map, of, tap } from "rxjs";
import { marbles } from "rxjs-marbles/jest";
import { throttleUntilSome } from "./throttleUntilSome";
describe("basic", () => {
  it(
    "should support marble tests without values",
    marbles((m) => {
      const source = m.hot("  --^-a-b-c-|");
      const subs = "            ^-------!";
      const expected = m.cold(" --b-c-d-|");

      const destination = source.pipe(
        map((value) => String.fromCharCode(value.charCodeAt(0) + 1))
      );
      m.expect(destination).toBeObservable(expected);
      m.expect(source).toHaveSubscriptions(subs);
    })
  );

  it(
    "should work with fewer than max concurrent streams",
    marbles((m) => {
      const source1 = m
        .cold(" -ab|", {
          a: of("a").pipe(delay(5)),
          b: of("b").pipe(delay(3)),
        })
        .pipe(throttleUntilSome(4));
      const expected = m.cold("-----b(a|)");
      m.expect(source1).toBeObservable(expected);
    })
  );

  // we can see here that the d and e observales are throttled until a emits, leaving room for d then b emits leaving room for e
  it(
    "should work with more than max concurrent streams",
    marbles((m) => {
      const source1 = m
        .cold("-abcde|", {
          a: of("a").pipe(delay(2, m.scheduler)),
          b: of("b").pipe(delay(7, m.scheduler)),
          c: of("c").pipe(delay(11, m.scheduler)),
          d: of("d").pipe(delay(13, m.scheduler)),
          e: of("e").pipe(delay(17, m.scheduler)),
        })
        .pipe(throttleUntilSome(3));
      const expected = m.cold("---a-----b----c--d--------(e|)"); //14 c    17 d       9+17=26 e
      m.expect(source1).toBeObservable(expected);
    })
  );
});
