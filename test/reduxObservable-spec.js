/* globals describe it */
import { expect } from 'chai';
import { createStore, applyMiddleware } from 'redux';
import { reduxObservable } from '../';
import * as Rx from 'rxjs';
import Promise from 'promise';
import 'babel-polyfill';
import $$observable from 'symbol-observable';

const { Observable } = Rx;

describe('reduxObservable', () => {
  it('should intercept and process actions', (done) => {
    const reducer = (state = [], action) => state.concat(action);

    const middleware = reduxObservable();

    const store = createStore(reducer, applyMiddleware(middleware));

    store.dispatch(() => Observable.of({ type: 'ASYNC_ACTION_1' }).delay(10));
    store.dispatch(() => Observable.of({ type: 'ASYNC_ACTION_2' }).delay(20));

    // HACKY: but should work until we use TestScheduler.
    setTimeout(() => {
      expect(store.getState()).to.deep.equal([
        { type: '@@redux/INIT' },
        { type: 'ASYNC_ACTION_1' },
        { type: 'ASYNC_ACTION_2' }
      ]);
      done();
    }, 100);
  });

  it('should work dispatched functions that return a promise', (done) => {
    const reducer = (state = [], action) => state.concat(action);

    const middleware = reduxObservable();

    const store = createStore(reducer, applyMiddleware(middleware));

    store.dispatch(() => Promise.resolve({ type: 'ASYNC_ACTION_1' }));
    store.dispatch(() => Promise.resolve({ type: 'ASYNC_ACTION_2' }));

    // HACKY: but should work until we use TestScheduler.
    setTimeout(() => {
      expect(store.getState()).to.deep.equal([
        { type: '@@redux/INIT' },
        { type: 'ASYNC_ACTION_1' },
        { type: 'ASYNC_ACTION_2' }
      ]);
      done();
    }, 100);
  });

  it('should work with iterators/generators', (done) => {
    const reducer = (state = [], action) => state.concat(action);

    const middleware = reduxObservable();

    const store = createStore(reducer, applyMiddleware(middleware));

    store.dispatch(() => (function *() {
      yield { type: 'ASYNC_ACTION_1' };
      yield { type: 'ASYNC_ACTION_2' };
    })());

    // HACKY: but should work until we use TestScheduler.
    setTimeout(() => {
      expect(store.getState()).to.deep.equal([
        { type: '@@redux/INIT' },
        { type: 'ASYNC_ACTION_1' },
        { type: 'ASYNC_ACTION_2' }
      ]);
      done();
    }, 100);
  });

  it('should work with observablesque arguments', (done) => {
    const reducer = (state = [], action) => state.concat(action);

    const middleware = reduxObservable();

    const store = createStore(reducer, applyMiddleware(middleware));

    let finalized = false;

    store.dispatch(() => ({
      [$$observable]() {
        return {
          subscribe(observer) {
            observer.next({ type: 'ASYNC_ACTION_1' });
            observer.next({ type: 'ASYNC_ACTION_2' });
            observer.complete();

            return {
              unsubscribe() {
                finalized = true;
              }
            };
          }
        };
      }
    }));

    // HACKY: but should work until we use TestScheduler.
    setTimeout(() => {
      expect(store.getState()).to.deep.equal([
        { type: '@@redux/INIT' },
        { type: 'ASYNC_ACTION_1' },
        { type: 'ASYNC_ACTION_2' }
      ]);

      expect(finalized).to.equal(true);
      done();
    }, 100);
  });

  it('should emit POJO actions to the actions Subject', (done) => {
    const reducer = (state = [], action) => state.concat(action);

    const middleware = reduxObservable();

    const store = createStore(reducer, applyMiddleware(middleware));

    store.dispatch(
      (actions) => Observable.of({ type: 'ASYNC_ACTION_2' })
        .delay(10)
        .takeUntil(actions.filter(action => action.type === 'ASYNC_ACTION_ABORT'))
        .merge(
          actions.map(
            action => ({ type: action.type + '_MERGED' })
          )
        )
        .startWith({ type: 'ASYNC_ACTION_1' })
    );

    store.dispatch({ type: 'ASYNC_ACTION_ABORT' });

    // HACKY: but should work until we use TestScheduler.
    setTimeout(() => {
      expect(store.getState()).to.deep.equal([
        { type: '@@redux/INIT' },
        { type: 'ASYNC_ACTION_1' },
        { type: 'ASYNC_ACTION_ABORT_MERGED' },
        { type: 'ASYNC_ACTION_ABORT' }
      ]);
      done();
    }, 100);
  });
});
