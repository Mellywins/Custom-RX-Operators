import {
  Observable,
  Subscription,
  share,
  take,
  tap,
  timeout,
  from,
  delay,
  of,
} from "rxjs";
//  takes a list of ids, size N, and for each one opens another stream.
// Custom rxjs operator
//  limit it such that we postpone the subscription to these other observables until some number of them have emitted at least once
// example: streamIds().pipe(mergeMap(id => streamSomethingElse(id)), throttleUntilSome(5))
//  throttleUntilSome(5) will open 5 streams, and then wait until at least one of them has emitted before opening the next one
export function throttleUntilSome<T>(
  n: number,
  subscribersTimeout = 3000
): (source$: Observable<Observable<T>>) => Observable<T> {
  return (source$: Observable<Observable<T>>) =>
    new Observable<T>((observer) => {
      const subscriptions: Subscription[] = [];
      const queue: Observable<T>[] = [];
      // active is the number of streams subbed to that have not emitted at least once
      let active = 0;
      // represents the number of observables not completed. Reaching 0 means we are done.
      let liveObservables = 0;
      const subscribe = () => {
        if (queue.length === 0) {
          return;
        }
        active++;
        const stream = queue.shift();
        const replayableStream = stream!.pipe(
          share(),
          timeout(subscribersTimeout)
        );
        // Notify when a subscription has emitted atleast once
        // To leave room for other subscriptions to be opened
        const tapSub = replayableStream
          .pipe(
            tap(() => {
              active--;
              subscribe();
            }),
            take(1)
          )
          .subscribe();
        subscriptions.push(tapSub);
        liveObservables++;
        const sub = replayableStream.subscribe({
          next: (value) => {
            observer.next(value);
          },
          error: (err) => observer.error(err),
          complete: () => {
            sub.unsubscribe();
            liveObservables--;
            if (active === 0 && liveObservables === 0) {
              observer.complete();
            }
          },
        });
        subscriptions.push(sub);
      };

      const sub = source$.subscribe({
        next: (stream) => {
          queue.push(stream);
          if (active < n) {
            subscribe();
          }
        },
        error: (err) => observer.error(err),
        complete: () => {},
      });

      return () => {
        sub.unsubscribe();
        subscriptions.forEach((s) => s.unsubscribe());
      };
    });
}
