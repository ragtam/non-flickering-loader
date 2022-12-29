import { auditTime, concatMap, map, Observable, of, timeInterval, timer, zip } from 'rxjs';
import { TestScheduler } from 'rxjs/internal/testing/TestScheduler';

const CONFIG = { ignoreValuesMs: 1, flickerIntervalMs: 200 };
type Config = typeof CONFIG;

export function nonFlickeringState(config: Config = CONFIG): (input$: Observable<boolean>) => Observable<boolean> {
    return (input$: Observable<boolean>) => {
        return input$.pipe(
            auditTime(config.ignoreValuesMs),
            timeInterval(),
            concatMap((res) => {
                if (res.value || res.interval <= config.ignoreValuesMs) {
                    return of(res.value);
                } else {
                    const t = timer(config.flickerIntervalMs - config.ignoreValuesMs - res.interval);
                    const f = of(false);
                    return zip(t, f).pipe(map(() => false));
                }
            })
        );
    };
}

function getTestScheduler() {
    return new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
    });
}

describe('non flickering loader', () => {
    it('emits change from [true] to [false] with 200ms delay between emissions (if change was less than 200ms) [0]', () => {
        getTestScheduler().run(({ expectObservable, hot }) => {
            const input = hot('a---b', { a: true, b: false });
            const res = input.pipe(nonFlickeringState());

            expectObservable(res).toBe('-a 198ms b', { a: true, b: false });
        });
    });

    it('emits change from [true] to [false] with 200ms delay between emissions (if change was less than 200ms) [1]', () => {
        getTestScheduler().run(({ expectObservable, hot }) => {
            const input = hot('a 100ms b', { a: true, b: false });
            const res = input.pipe(nonFlickeringState());

            expectObservable(res).toBe('-a 198ms b', { a: true, b: false });
        });
    });

    it('emits change from [true] to [false] with no additional delay between emissions (if change was more than 200ms)', () => {
        getTestScheduler().run(({ expectObservable, hot }) => {
            const input = hot('a 300ms b', { a: true, b: false });
            const res = input.pipe(nonFlickeringState());

            expectObservable(res).toBe('-a 300ms b', { a: true, b: false });
        });
    });

    it('adds no delay if change from [true] to [false] was 1ms', () => {
        getTestScheduler().run(({ expectObservable, hot }) => {
            const input = hot('ab', { a: true, b: false });
            const res = input.pipe(nonFlickeringState());

            expectObservable(res).toBe('-b', { b: false });
        });
    });
});
