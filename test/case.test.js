import { extend } from 'lodash';
import squel from '../src';
import { BaseBuilder, DefaultQueryBuilderOptions } from '../src/base-builder';

const areEqual = function (actual, expected, message) {
    expect(actual).toEqual(expected);
};

let inst = squel.case();

describe('Case expression builder base class', () => {
    beforeEach(() => {
        inst = squel.case();
    });

    it('extends BaseBuilder', () => {
        expect(inst instanceof BaseBuilder).toBeTruthy();
    });

    it('toString() returns NULL', () => {
        areEqual('NULL', inst.toString());
    });

    it('when() needs to be called first', () => {
        expect(() => inst.then('foo')).toThrow();
    });

    describe('options', () => {
        it('default options', () => {
            areEqual(DefaultQueryBuilderOptions, inst.options);
        });
        it('custom options', () => {
            const e = squel.case({
                separator: ',asdf',
            });

            const expected = extend({}, DefaultQueryBuilderOptions, {
                separator: ',asdf',
            });

            areEqual(expected, e.options);
        });
    });

    describe('build expression', () => {
        describe('>> when().then()', () => {
            beforeEach(() => {
                inst.when('?', 'foo').then('bar');
            });

            it('toString', () => {
                areEqual(inst.toString(), "CASE WHEN ('foo') THEN 'bar' ELSE NULL END");
            });
            it('toParam', () => {
                areEqual(inst.toParam(), {
                    text: "CASE WHEN (?) THEN 'bar' ELSE NULL END",
                    values: ['foo'],
                });
            });
        });

        describe('>> when().then().else()', () => {
            beforeEach(() => {
                inst.when('?', 'foo').then('bar').else('foobar');
            });
            it('toString', () => {
                areEqual(inst.toString(), "CASE WHEN ('foo') THEN 'bar' ELSE 'foobar' END");
            });
            it('toParam', () => {
                areEqual(inst.toParam(), {
                    text: "CASE WHEN (?) THEN 'bar' ELSE 'foobar' END",
                    values: ['foo'],
                });
            });
        });
    });

    describe('field case', () => {
        beforeEach(() => {
            inst = squel.case('name').when('?', 'foo').then('bar');
        });
        it('toString', () => {
            areEqual(inst.toString(), "CASE name WHEN ('foo') THEN 'bar' ELSE NULL END");
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: "CASE name WHEN (?) THEN 'bar' ELSE NULL END",
                values: ['foo'],
            });
        });
    });

    describe('field case no param', () => {
        beforeEach(() => {
            inst = squel.case('name').when('foo').then('bar');
        });
        it('toString', () => {
            areEqual(inst.toString(), "CASE name WHEN (foo) THEN 'bar' ELSE NULL END");
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: "CASE name WHEN (foo) THEN 'bar' ELSE NULL END",
                values: [],
            });
        });
    });
});
