import { mockAnnotationFactory } from './index';
import { Annotation } from '../index';

describe('MockAnnotation', function () {
    it('should throw when the value argument is not present', function () {
        (() => createAnnotation('foo', null, null)).should.throw(`required argument: 'value'`);
    });

    it('should throw when the type name is not present', function () {
        (() => createAnnotation(null, null)).should.throw(`Type name is required`);
    });

    it('should mock the type', function () {
        const mocks: any = {};

        createAnnotation('foo', null).apply(null, mocks, {}, {});

        mocks.foo().should.be.a('string');
    });

    it('should throw when the field mock already exists', function () {
        const mocks: any = {foo: (): any => ({bar: 'baz'})};

        (() => createAnnotation('foo', 'bar').apply(null, mocks, {}, {})).should.throw('already exists');
    });

    it('should mock the field when it is the only field mock', function () {
        const mocks: any = {};

        createAnnotation('foo', 'bar').apply(null, mocks, {}, {});

        mocks.foo().bar.should.be.a('string');
    });

    it('should mock the field when there is already another field mock', function () {
        const mocks: any = {foo: (): any => ({})};

        createAnnotation('foo', 'bar').apply(null, mocks, {}, {});

        mocks.foo().bar.should.be.a('string');
    });

    it('should mock the two fields', function () {
        const mocks: any = {};

        createAnnotation('foo', 'bar').apply(null, mocks, {}, {});
        createAnnotation('foo', 'baz').apply(null, mocks, {}, {});

        mocks.foo().bar.should.be.a('string');
        mocks.foo().baz.should.be.a('string');
    });

    it('should pass the arguments to casual', function () {
        const mocks: any = {};

        createAnnotation('foo', 'bar', 'date', ['DD.MM.YY']).apply(null, mocks, {}, {});

        mocks.foo().bar.should.match(/..\...\.../);
    });

    it('should support one_of values', function () {
        const values = ['foo', 'bar', 'baz'];
        const mocks: any = {};

        createAnnotation('foo', 'bar', 'one_of', values).apply(null, mocks, {}, {});

        (values.indexOf(mocks.foo().bar) > -1).should.be.true;
    });

    it('should return the value by default', function () {
        const mocks: any = {};

        createAnnotation('foo', 'bar', 42).apply(null, mocks, {}, {});

        mocks.foo().bar.should.equal(42);
    });
});

function createAnnotation(typeName: string, fieldName: string, value: any = 'country', args?: Array<any>): Annotation {
    const directiveArguments = [];

    if (value) {
        directiveArguments.push({name: 'value', value: value});
    }

    if (args) {
        directiveArguments.push({name: 'args', value: args});
    }

    return mockAnnotationFactory({tag: 'rest', arguments: directiveArguments}, typeName, fieldName);
}
