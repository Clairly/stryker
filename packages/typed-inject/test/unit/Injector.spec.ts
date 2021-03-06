import { expect } from 'chai';
import { Injector } from '../../src/api/Injector';
import { tokens } from '../../src/tokens';
import { rootInjector } from '../../src/InjectorImpl';
import { TARGET_TOKEN, INJECTOR_TOKEN } from '../../src/api/InjectionToken';
import Exception from '../../src/Exception';
import { Scope } from '../../src/api/Scope';

describe('InjectorImpl', () => {

  describe('RootInjector', () => {

    it('should be able to inject injector and target in a class', () => {
      // Arrange
      class Injectable {
        constructor(
          public readonly target: Function | undefined,
          public readonly injector: Injector<{}>) {
        }
        public static inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);
      }

      // Act
      const actual = rootInjector.injectClass(Injectable);

      // Assert
      expect(actual.target).eq(undefined);
      expect(actual.injector).eq(rootInjector);
    });

    it('should be able to inject injector and target in a function', () => {
      // Arrange
      let actualTarget: Function | undefined;
      let actualInjector: Injector<{}> | undefined;
      const expectedResult = { result: 42 };
      function injectable(t: Function | undefined, i: Injector<{}>) {
        actualTarget = t;
        actualInjector = i;
        return expectedResult;
      }
      injectable.inject = tokens(TARGET_TOKEN, INJECTOR_TOKEN);

      // Act
      const actualResult: { result: number } = rootInjector.injectFunction(injectable);

      // Assert
      expect(actualTarget).eq(undefined);
      expect(actualInjector).eq(rootInjector);
      expect(actualResult).eq(expectedResult);
    });

    it('should throw when no provider was found', () => {
      class FooInjectable {
        constructor(public foo: string) {
        }
        public static inject = tokens('foo');
      }
      expect(() => rootInjector.injectClass(FooInjectable as any)).throws(Exception,
        'Could not inject "FooInjectable". Inner error: No provider found for "foo"!');
    });
  });

  describe('ValueInjector', () => {
    it('should be able to provide a value', () => {
      const sut = rootInjector.provideValue('foo', 42);
      const actual = sut.injectClass(class {
        constructor(public foo: number) { }
        public static inject = tokens('foo');
      });
      expect(actual.foo).eq(42);
    });
    it('should be able to provide a value from the parent injector', () => {
      const sut = rootInjector
        .provideValue('foo', 42)
        .provideValue('bar', 'baz');
      expect(sut.resolve('bar')).eq('baz');
    });
  });

  describe('FactoryInjector', () => {
    it('should be able to provide the return value of the factoryMethod', () => {
      const expectedValue = { foo: 'bar' };
      function foobar() {
        return expectedValue;
      }

      const actual = rootInjector
        .provideFactory('foobar', foobar)
        .injectClass(class {
          constructor(public foobar: { foo: string }) { }
          public static inject = tokens('foobar');
        });
      expect(actual.foobar).eq(expectedValue);
    });

    it('should be able still provide parent injector values', () => {
      function truth() {
        return true;
      }
      truth.inject = tokens();
      const factoryInjector = rootInjector.provideFactory('truth', truth);
      const actual = factoryInjector.injectClass(class {
        constructor(public injector: Injector<{ truth: boolean }>, public target: Function | undefined) { }
        public static inject = tokens(INJECTOR_TOKEN, TARGET_TOKEN);
      });
      expect(actual.injector).eq(factoryInjector);
      expect(actual.target).undefined;
    });

    it('should cache the value if scope = Singleton', () => {
      // Arrange
      let n = 0;
      function count() {
        return n++;
      }
      count.inject = tokens();
      const countInjector = rootInjector.provideFactory('count', count);
      class Injectable {
        constructor(public count: number) { }
        public static inject = tokens('count');
      }

      // Act
      const first = countInjector.injectClass(Injectable);
      const second = countInjector.injectClass(Injectable);

      // Assert
      expect(first.count).eq(second.count);
    });

    it('should _not_ cache the value if scope = Transient', () => {
      // Arrange
      let n = 0;
      function count() {
        return n++;
      }
      count.inject = tokens();
      const countInjector = rootInjector.provideFactory('count', count, Scope.Transient);
      class Injectable {
        constructor(public count: number) { }
        public static inject = tokens('count');
      }

      // Act
      const first = countInjector.injectClass(Injectable);
      const second = countInjector.injectClass(Injectable);

      // Assert
      expect(first.count).eq(0);
      expect(second.count).eq(1);
    });
  });

  describe('dependency tree', () => {
    it('should be able to inject a dependency tree', () => {
      // Arrange
      class Logger {
        public info(_msg: string) {
        }
      }
      class GrandChild {
        public baz = 'qux';
        constructor(public log: Logger) {
        }
        public static inject = tokens('logger');
      }
      class Child1 {
        public bar = 'foo';
        constructor(public log: Logger, public grandchild: GrandChild) {
        }
        public static inject = tokens('logger', 'grandChild');
      }
      class Child2 {
        public foo = 'bar';
        constructor(public log: Logger) {
        }
        public static inject = tokens('logger');
      }
      class Parent {
        constructor(
          public readonly child: Child1,
          public readonly child2: Child2,
          public readonly log: Logger) {
        }
        public static inject = tokens('child1', 'child2', 'logger');
      }
      const expectedLogger = new Logger();

      // Act
      const actual = rootInjector
        .provideValue('logger', expectedLogger)
        .provideClass('grandChild', GrandChild)
        .provideClass('child1', Child1)
        .provideClass('child2', Child2)
        .injectClass(Parent);

      // Assert
      expect(actual.child.bar).eq('foo');
      expect(actual.child2.foo).eq('bar');
      expect(actual.child.log).eq(expectedLogger);
      expect(actual.child2.log).eq(expectedLogger);
      expect(actual.child.grandchild.log).eq(expectedLogger);
      expect(actual.child.grandchild.baz).eq('qux');
      expect(actual.log).eq(expectedLogger);
    });
  });
});
