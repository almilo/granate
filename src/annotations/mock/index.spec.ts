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

    it('should throw when the mock already exists', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo');
        const mocks: any = {
            foo: (): any => null
        };

        (() => mockAnnotation.apply(null, mocks)).should.throw('already exists');
    });

    it('should mock the type', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo');
        const mocks: any = {};

        mockAnnotation.apply(null, mocks);

        mocks.foo().should.be.a('string');
    });

    it('should mock the field', function () {
        const mockAnnotation = mockAnnotationFactory(directiveInfo, 'foo', 'bar');
        const mocks: any = {};

        mockAnnotation.apply(null, mocks);

        mocks.foo().bar().should.be.a('string');
    });
});
