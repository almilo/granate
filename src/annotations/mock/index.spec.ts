import { mockAnnotationFactory } from './index';
import { DirectiveArgument, Annotation } from '../index';

const directiveArguments = [{name: 'value', value: 'country'}];

describe('MockAnnotation', function () {
    it('should throw when the value argument is not present', function () {
        (() => createAnnotation('foo', null, [])).should.throw(`required argument: 'value'`);
    });

    it('should throw when the value argument is not string', function () {
        (() => createAnnotation('foo', null, [{name: 'value', value: 42}])).should.throw(`should be of type: 'string'`);
    });

    it('should throw when the type name is not present', function () {
        (() => createAnnotation(null, null, undefined)).should.throw(`Type name is required`);
    });

    it('should mock the type', function () {
        const mocks: any = {};

        createAnnotation('foo', null, directiveArguments).apply(null, mocks, {}, {});

        mocks.foo().should.be.a('string');
    });

    it('should throw when the field mock already exists', function () {
        const mocks: any = {foo: (): any => ({bar: 'baz'})};

        (() => createAnnotation('foo', 'bar', directiveArguments).apply(null, mocks, {}, {})).should.throw('already exists');
    });

    it('should mock the field when it is the only field mock', function () {
        const mocks: any = {};

        createAnnotation('foo', 'bar', directiveArguments).apply(null, mocks, {}, {});

        mocks.foo().bar.should.be.a('string');
    });

    it('should mock the field when there is already another field mock', function () {
        const mocks: any = {foo: (): any => ({})};

        createAnnotation('foo', 'bar', directiveArguments).apply(null, mocks, {}, {});

        mocks.foo().bar.should.be.a('string');
    });

    it('should mock the two fields', function () {
        const mocks: any = {};

        createAnnotation('foo', 'bar', directiveArguments).apply(null, mocks, {}, {});
        createAnnotation('foo', 'baz', directiveArguments).apply(null, mocks, {}, {});

        mocks.foo().bar.should.be.a('string');
        mocks.foo().baz.should.be.a('string');
    });

    it('should pass the arguments to casual', function () {
        const argsDirectiveInfo = [{name: 'value', value: 'date'}, {name: 'args', value: '["DD.MM.YY"]'}];
        const mocks: any = {};

        createAnnotation('foo', 'bar', argsDirectiveInfo).apply(null, mocks, {}, {});

        mocks.foo().bar.should.match(/..\...\.../);
    });
});

function createAnnotation(typeName: string, fieldName: string, directiveArguments: Array<DirectiveArgument>): Annotation {
    const directiveInfo = {tag: 'rest', arguments: directiveArguments};

    return mockAnnotationFactory(directiveInfo, typeName, fieldName);
}
