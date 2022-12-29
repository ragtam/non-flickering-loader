import {concatMap, map, Observable, of, pairwise, startWith, timeInterval, timer, zip} from "rxjs";
import {TestScheduler} from "rxjs/internal/testing/TestScheduler";

export function nonFlickeringState(): (input$: Observable<boolean>) => Observable<boolean> {
  return ( input$: Observable<boolean> ) => {
    return input$.pipe( timeInterval(), concatMap( res => {
      if(res.value){
        return of(true);
      } else if ( res.interval < 2 ) {
        return of(false)
      } else {
        const t = timer(200 - res.interval);
        const f = of(false);
        return zip(t, f).pipe(map(() => false));
      }
    } ), timeInterval(), startWith({ interval: -1, value: false }), pairwise(), map(([ first, second ]) => {
      console.info(first, second);
      return second.value;
    }) )
  }
}

function getTestScheduler() {
  return new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  })
}

describe('non flickering loader', () => {
  it('how timer works with negative time', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const input = hot('a 20ms b', { a: true, b: false });
      const res = input.pipe(nonFlickeringState());

      expectObservable( timer(-100) ).toBe('(a|)', { a: 0 });
    })
  })

  it('emits change from [true] to [false] with 200ms delay between emissions (if change was less than 200ms) [0]', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const input = hot('a---b', { a: true, b: false });
      const res = input.pipe(nonFlickeringState());

      expectObservable( res ).toBe('a 199ms b', { a: true, b: false });
    })
  })

  it('emits change from [true] to [false] with 200ms delay between emissions (if change was less than 200ms) [1]', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const input = hot('a 100ms b', { a: true, b: false });
      const res = input.pipe(nonFlickeringState());

      expectObservable( res ).toBe('a 199ms b', { a: true, b: false });
    })
  })

  it('emits change from [true] to [false] with no additional delay between emissions (if change was more than 200ms)', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const input = hot('a 300ms b', { a: true, b: false });
      const res = input.pipe(nonFlickeringState());

      expectObservable( res ).toBe('a 300ms b', { a: true, b: false });
    })
  })

  it('adds no delay if change from [true] to [false] was 1ms', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const input = hot('ab', { a: true, b: false });
      const res = input.pipe(nonFlickeringState());

      expectObservable( res ).toBe('ab', { a: true, b: false });
    })
  })
});
