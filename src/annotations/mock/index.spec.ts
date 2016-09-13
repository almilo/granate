import { mockAnnotationFactory } from './index';

const directiveInfo = {tag: 'mock', arguments: [{name: 'value', value: 'country'}]};

describe('MockAnnotation', function () {
    it('should throw when the value argument is not present', function () {
        (() => mockAnnotationFactory({tag: 'mock', arguments: []}, 'foo', null))
            .should.throw(`required argument: 'value'`);
    });

    it('should throw when the value argument is not string', function () {
        (() => mockAnnotationFactory({tag: 'mock', arguments: [{name: 'value', value: 42}]}, 'foo', null))
            .should.throw(`should be of type: 'string'`);
    });

    it('should throw when the type name is not present', function () {
        (() => mockAnnotationFactory(directiveInfo, null, null))
            .should.throw(`Type name is required`);
    });

    it('should mock the type', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo');
        const mocks: any = {};

        mockAnnotation.apply(null, mocks);

        mocks.foo().should.be.a('string');
    });

    it('should throw when the field mock already exists', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo', 'bar');
        const mocks: any = {
            foo: (): any => ({bar: 'baz'})
        };

        (() => mockAnnotation.apply(null, mocks)).should.throw('already exists');
    });

    it('should mock the field when it is the only field mock', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo', 'bar');
        const mocks: any = {};

        mockAnnotation.apply(null, mocks);

        mocks.foo().bar.should.be.a('string');
    });

    it('should mock the field when there is already another field mock', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo', 'bar');
        const mocks: any = {
            foo: (): any => ({})
        };

        mockAnnotation.apply(null, mocks);

        mocks.foo().bar.should.be.a('string');
    });

    it('should mock the two fields', function () {
        const mockAnnotation1 = mockAnnotationFactory(directiveInfo, 'foo', 'bar');
        const mockAnnotation2 = mockAnnotationFactory(directiveInfo, 'foo', 'baz');
        const mocks: any = {};

        mockAnnotation1.apply(null, mocks);
        mockAnnotation2.apply(null, mocks);

        mocks.foo().bar.should.be.a('string');
        mocks.foo().baz.should.be.a('string');
    });

    it('should pass the arguments to casual', function () {
        const argsDirectiveInfo = {
            tag: 'mock', arguments: [
                {name: 'value', value: 'date'},
                {name: 'args', value: '["DD.MM.YY"]'}
            ]
        };
        const mockAnnotation = mockAnnotationFactory(argsDirectiveInfo, 'foo', 'bar');
        const mocks: any = {};

        mockAnnotation.apply(null, mocks);

        mocks.foo().bar.should.match(/..\...\.../);
    });
});
