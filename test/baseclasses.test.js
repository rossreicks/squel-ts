/* eslint-disable no-plusplus */
/* eslint-disable no-new-object */
/* eslint-disable max-classes-per-file */

import sinon from 'sinon';
import { extend, find } from 'lodash';
import squel from '../src';
import { StringBlock, FunctionBlock, LimitBlock, DistinctBlock, WhereBlock, Block } from '../src/block';
import { BaseBuilder, DefaultQueryBuilderOptions } from '../src/base-builder';
import { QueryBuilder } from '../src/query-builder';
import { Cloneable } from '../src/cloneable';

let mocker;
let inst = new BaseBuilder();

const areEqual = function (actual, expected, message) {
    expect(actual).toEqual(expected);
};

describe('Base Classes', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
    });

    beforeEach(() => {
        mocker = sinon.sandbox.create();
        inst = new BaseBuilder();
    });

    afterEach(() => {
        mocker.restore();
    });

    it('Default flavour', () => {
        expect(squel.flavour).toBeNull();
    });

    it('should throw error when switching to an unknown flavour', () => {
        expect(() => squel.useFlavour('foo')).toThrow();
    });

    describe('Cloneable Base Class', () => {
        it('Clone', () => {
            class Child extends Cloneable {
                constructor() {
                    super();
                    this.a = 1;
                    this.b = 2.2;
                    this.c = true;
                    this.d = 'str';
                    this.e = [1];
                    this.f = { a: 1 };
                }
            }

            const child = new Child();

            const copy = child.clone();

            expect(copy).toBeInstanceOf(Child);

            child.a = 2;
            child.b = 3.2;
            child.c = false;
            child.d = 'str2';
            child.e.push(2);
            child.f.b = 1;

            areEqual(copy.a, 1);
            areEqual(copy.b, 2.2);
            areEqual(copy.c, true);
            areEqual(copy.d, 'str');
            areEqual(copy.e, [1]);
            areEqual(copy.f, { a: 1 });
        });
    });

    it('Default query builder options', () => {
        areEqual(
            {
                autoQuoteTableNames: false,
                autoQuoteFieldNames: false,
                autoQuoteAliasNames: true,
                useAsForTableAliasNames: false,
                nameQuoteCharacter: '`',
                tableAliasQuoteCharacter: '`',
                fieldAliasQuoteCharacter: '"',
                valueHandlers: [],
                parameterCharacter: '?',
                numberedParameters: false,
                numberedParametersPrefix: '$',
                numberedParametersStartAt: 1,
                replaceSingleQuotes: false,
                singleQuoteReplacement: "''",
                separator: ' ',
                stringFormatter: null,
                rawNesting: false,
            },
            DefaultQueryBuilderOptions
        );
    });

    describe('Register global custom value handler', () => {
        let originalHandlers;

        beforeEach(() => {
            originalHandlers = [].concat(squel.globalValueHandlers);
            squel.globalValueHandlers = [];
        });

        afterEach(() => {
            squel.globalValueHandlers = originalHandlers;
        });

        it('default', () => {
            const handler = () => 'test';

            squel.registerValueHandler(Date, handler);
            squel.registerValueHandler(Object, handler);
            squel.registerValueHandler('boolean', handler);

            areEqual(3, squel.globalValueHandlers.length);
            areEqual({ type: Date, handler }, squel.globalValueHandlers[0]);
            areEqual({ type: Object, handler }, squel.globalValueHandlers[1]);
            areEqual({ type: 'boolean', handler }, squel.globalValueHandlers[2]);
        });

        it('type should be class constructor', () => {
            expect(() => squel.registerValueHandler(1, null)).toThrow();
        });

        it('handler should be function', () => {
            class MyClass {}

            expect(() => squel.registerValueHandler(MyClass, 1)).toThrow();
        });

        it('overrides existing handler', () => {
            const handler = () => 'test';
            const handler2 = () => 'test2';

            squel.registerValueHandler(Date, handler);
            squel.registerValueHandler(Date, handler2);

            areEqual(1, squel.globalValueHandlers.length);
            areEqual({ type: Date, handler: handler2 }, squel.globalValueHandlers[0]);
        });
    });

    describe('str()', () => {
        it('constructor()', () => {
            const f = squel.str('GETDATE(?)', 12, 23);

            expect(f instanceof FunctionBlock).toBeTruthy();
            areEqual('GETDATE(?)', f._strings[0]);
            areEqual([12, 23], f._values[0]);
        });

        describe('custom value handler', () => {
            let handler;

            beforeEach(() => {
                inst = squel.str('G(?,?)', 12, 23, 65);

                const handlerConfig = find(squel.globalValueHandlers, (hc) => hc.type === FunctionBlock);

                handler = handlerConfig.handler;
            });

            it('toString', () => {
                areEqual(inst.toString(), handler(inst));
            });
            it('toParam', () => {
                areEqual(inst.toParam(), handler(inst, true));
            });
        });
    });

    describe('rstr()', () => {
        it('constructor()', () => {
            const f = squel.rstr('GETDATE(?)', 12, 23);

            expect(f instanceof FunctionBlock).toBeTruthy();
            areEqual('GETDATE(?)', f._strings[0]);
            areEqual([12, 23], f._values[0]);
        });

        it('vsStr()', () => {
            const f1 = squel.str('OUTER(?)', squel.str('INNER(?)', 2));

            areEqual('OUTER((INNER(2)))', f1.toString());
            const f2 = squel.str('OUTER(?)', squel.rstr('INNER(?)', 2));

            areEqual('OUTER(INNER(2))', f2.toString());
        });

        describe('custom value handler', () => {
            let handler;

            beforeEach(() => {
                inst = squel.rstr('G(?,?)', 12, 23, 65);

                const handlerConfig = find(squel.globalValueHandlers, (hc) => hc.type === FunctionBlock);

                handler = handlerConfig.handler;
            });

            it('toString', () => {
                areEqual(inst.toString(), handler(inst));
            });
            it('toParam', () => {
                areEqual(inst.toParam(), handler(inst, true));
            });
        });
    });

    describe('Builder base class', () => {
        let originalHandlers = squel.globalValueHandlers;

        beforeEach(() => {
            inst = new BaseBuilder();

            originalHandlers = [].concat(squel.globalValueHandlers);
        });

        afterEach(() => {
            squel.globalValueHandlers = originalHandlers;
        });

        it('instanceof Cloneable', () => {
            expect(inst).toBeInstanceOf(Cloneable);
        });

        describe('constructor', () => {
            it('default options', () => {
                areEqual(DefaultQueryBuilderOptions, inst.options);
            });

            it('overridden options', () => {
                inst = new BaseBuilder({
                    dummy1: 'str',
                    dummy2: 12.3,
                    usingValuePlaceholders: true,
                    dummy3: true,
                    globalValueHandlers: [1],
                });

                const expectedOptions = extend({}, DefaultQueryBuilderOptions, {
                    dummy1: 'str',
                    dummy2: 12.3,
                    usingValuePlaceholders: true,
                    dummy3: true,
                    globalValueHandlers: [1],
                });

                areEqual(expectedOptions, inst.options);
            });
        });

        describe('registerValueHandler', () => {
            it('afterEach', () => {
                squel.globalValueHandlers = [];
            });

            it('default', () => {
                const handler = () => 'test';

                inst.registerValueHandler(Date, handler);
                inst.registerValueHandler(Object, handler);
                inst.registerValueHandler('number', handler);

                areEqual(3, inst.options.valueHandlers.length);
                areEqual({ type: Date, handler }, inst.options.valueHandlers[0]);
                areEqual({ type: Object, handler }, inst.options.valueHandlers[1]);
                areEqual({ type: 'number', handler }, inst.options.valueHandlers[2]);
            });

            it('type should be class constructor', () => {
                expect(() => inst.registerValueHandler(1, null)).toThrow();
            });

            it('handler should be function', () => {
                class MyClass {}
                expect(() => inst.registerValueHandler(MyClass, 1)).toThrow();
            });

            it('returns instance for chainability', () => {
                const handler = () => 'test';

                areEqual(inst, inst.registerValueHandler(Date, handler));
            });

            it('overrides existing handler', () => {
                const handler = () => 'test';
                const handler2 = () => 'test2';

                inst.registerValueHandler(Date, handler);
                inst.registerValueHandler(Date, handler2);

                areEqual(1, inst.options.valueHandlers.length);
                areEqual({ type: Date, handler: handler2 }, inst.options.valueHandlers[0]);
            });

            it('does not touch global value handlers list', () => {
                const oldGlobalHandlers = squel.globalValueHandlers;

                const handler = () => 'test';

                inst.registerValueHandler(Date, handler);

                areEqual(oldGlobalHandlers, squel.globalValueHandlers);
            });
        });

        describe('_sanitizeExpression', () => {
            describe('if Expression', () => {
                it('empty expression', () => {
                    const e = squel.expr();

                    areEqual(e, inst._sanitizeExpression(e));
                });
                it('non-empty expression', () => {
                    const e = squel.expr().and("s.name <> 'Fred'");

                    areEqual(e, inst._sanitizeExpression(e));
                });
            });

            it('if Expression', () => {
                const s = squel.str('s');

                areEqual(s, inst._sanitizeExpression(s));
            });

            it('if string', () => {
                const s = 'BLA BLA';

                areEqual('BLA BLA', inst._sanitizeExpression(s));
            });

            it('if neither expression, builder nor String', () => {
                const testFn = () => inst._sanitizeExpression(1);

                expect(testFn).toThrow();
            });
        });

        describe('_sanitizeName', () => {
            beforeEach(() => {
                mocker.spy(inst, '_sanitizeName');
            });

            it('if string', () => {
                areEqual('bla', inst._sanitizeName('bla'));
            });

            it('if boolean', () => {
                expect(() => inst._sanitizeName(true, 'bla')).toThrow();
            });

            it('if integer', () => {
                expect(() => inst._sanitizeName(1)).toThrow();
            });

            it('if float', () => {
                expect(() => inst._sanitizeName(1.2, 'meh')).toThrow();
            });

            it('if array', () => {
                expect(() => inst._sanitizeName([1], 'yes')).toThrow();
            });

            it('if object', () => {
                expect(() => inst._sanitizeName(new Object(), 'yes')).toThrow();
            });

            it('if null', () => {
                expect(() => inst._sanitizeName(null, 'no')).toThrow();
            });

            it('if undefined', () => {
                expect(() => inst._sanitizeName(undefined, 'no')).toThrow();
            });
        });

        describe('_sanitizeField', () => {
            it('default', () => {
                mocker.spy(inst, '_sanitizeName');

                areEqual('abc', inst._sanitizeField('abc'));

                expect(inst._sanitizeName.calledWithExactly('abc', 'field name')).toBeTruthy();
            });

            it('QueryBuilder', () => {
                const s = squel.select().from('scores').field('MAX(score)');

                areEqual(s, inst._sanitizeField(s));
            });
        });

        describe('_sanitizeBaseBuilder', () => {
            it('is not base builder', () => {
                expect(() => inst._sanitizeBaseBuilder(null)).toThrow();
            });

            it('is a query builder', () => {
                const qry = squel.select();

                areEqual(qry, inst._sanitizeBaseBuilder(qry));
            });
        });

        describe('_sanitizeTable', () => {
            it('default', () => {
                mocker.spy(inst, '_sanitizeName');

                areEqual('abc', inst._sanitizeTable('abc'));

                expect(inst._sanitizeName.calledWithExactly('abc', 'table')).toBeTruthy();
            });

            it('not a string', () => {
                expect(() => inst._sanitizeTable(null)).toThrow();
            });

            it('query builder', () => {
                const select = squel.select();

                areEqual(select, inst._sanitizeTable(select, true));
            });
        });

        describe('_sanitizeFieldAlias', () => {
            it('default', () => {
                mocker.spy(inst, '_sanitizeName');

                inst._sanitizeFieldAlias('abc');

                expect(inst._sanitizeName.calledWithExactly('abc', 'field alias')).toBeTruthy();
            });
        });

        describe('_sanitizeTableAlias', () => {
            it('default', () => {
                mocker.spy(inst, '_sanitizeName');

                inst._sanitizeTableAlias('abc');

                expect(inst._sanitizeName.calledWithExactly('abc', 'table alias')).toBeTruthy();
            });
        });

        describe('_sanitizeLimitOffset', () => {
            it('undefined', () => {
                expect(() => inst._sanitizeLimitOffset()).toThrow();
            });

            it('null', () => {
                expect(() => inst._sanitizeLimitOffset(null)).toThrow();
            });

            it('float', () => {
                areEqual(1, inst._sanitizeLimitOffset(1.2));
            });

            it('boolean', () => {
                expect(() => inst._sanitizeLimitOffset(false)).toThrow();
            });

            it('string', () => {
                areEqual(2, inst._sanitizeLimitOffset('2'));
            });

            it('array', () => {
                areEqual(3, inst._sanitizeLimitOffset([3]));
            });

            it('object', () => {
                expect(() => inst._sanitizeLimitOffset(new Object())).toThrow();
            });

            it('number >= 0', () => {
                areEqual(0, inst._sanitizeLimitOffset(0));
                areEqual(1, inst._sanitizeLimitOffset(1));
            });

            it('number < 0', () => {
                expect(() => inst._sanitizeLimitOffset(-1)).toThrow();
            });
        });

        describe('_sanitizeValue', () => {
            beforeEach(() => {
                mocker.spy(inst, '_sanitizeValue');
            });

            afterEach(() => {
                squel.globalValueHandlers = [];
            });

            it('if string', () => {
                areEqual('bla', inst._sanitizeValue('bla'));
            });

            it('if boolean', () => {
                areEqual(true, inst._sanitizeValue(true));
                areEqual(false, inst._sanitizeValue(false));
            });

            it('if integer', () => {
                areEqual(-1, inst._sanitizeValue(-1));
                areEqual(0, inst._sanitizeValue(0));
                areEqual(1, inst._sanitizeValue(1));
            });

            it('if float', () => {
                areEqual(-1.2, inst._sanitizeValue(-1.2));
                areEqual(1.2, inst._sanitizeValue(1.2));
            });

            it('if array', () => {
                expect(() => inst._sanitizeValue([1])).toThrow();
            });

            it('if object', () => {
                expect(() => inst._sanitizeValue(new Object())).toThrow();
            });
            it('if null', () => {
                areEqual(null, inst._sanitizeValue(null));
            });

            it('if BaseBuilder', () => {
                const s = squel.select();

                areEqual(s, inst._sanitizeValue(s));
            });

            it('if undefined', () => {
                expect(() => inst._sanitizeValue(undefined)).toThrow();
            });

            describe('custom handlers', () => {
                const identity = (value) => value;

                it('global', () => {
                    squel.registerValueHandler(Date, identity);
                    const date = new Date();

                    areEqual(date, inst._sanitizeValue(date));
                });

                it('instance', () => {
                    inst.registerValueHandler(Date, identity);
                    const date = new Date();

                    areEqual(date, inst._sanitizeValue(date));
                });
            });
        });

        it('_escapeValue', () => {
            inst.options.replaceSingleQuotes = false;
            areEqual("te'st", inst._escapeValue("te'st"));

            inst.options.replaceSingleQuotes = true;
            areEqual("te''st", inst._escapeValue("te'st"));

            inst.options.singleQuoteReplacement = '--';
            areEqual('te--st', inst._escapeValue("te'st"));

            inst.options.singleQuoteReplacement = '--';
            areEqual(undefined, inst._escapeValue());
        });

        describe('_formatTableName', () => {
            it('default', () => {
                areEqual('abc', inst._formatTableName('abc'));
            });

            describe('auto quote names', () => {
                beforeEach(() => {
                    inst.options.autoQuoteTableNames = true;
                });

                it('default quote character', () => {
                    areEqual('`abc`', inst._formatTableName('abc'));
                });

                it('custom quote character', () => {
                    inst.options.nameQuoteCharacter = '|';
                    areEqual('|abc|', inst._formatTableName('abc'));
                });
            });
        });

        describe('_formatTableAlias', () => {
            it('default', () => {
                areEqual('`abc`', inst._formatTableAlias('abc'));
            });

            it('custom quote character', () => {
                inst.options.tableAliasQuoteCharacter = '~';
                areEqual('~abc~', inst._formatTableAlias('abc'));
            });

            it('auto quote alias names is OFF', () => {
                inst.options.autoQuoteAliasNames = false;
                areEqual('abc', inst._formatTableAlias('abc'));
            });

            it('AS is turned ON', () => {
                inst.options.autoQuoteAliasNames = false;
                inst.options.useAsForTableAliasNames = true;
                areEqual('AS abc', inst._formatTableAlias('abc'));
            });
        });

        describe('_formatFieldAlias', () => {
            it('default()', () => {
                areEqual('"abc"', inst._formatFieldAlias('abc'));
            });

            it('custom quote character', () => {
                inst.options.fieldAliasQuoteCharacter = '~';
                areEqual('~abc~', inst._formatFieldAlias('abc'));
            });

            it('auto quote alias names is OFF', () => {
                inst.options.autoQuoteAliasNames = false;
                areEqual('abc', inst._formatFieldAlias('abc'));
            });
        });

        describe('_formatFieldName', () => {
            it('default()', () => {
                areEqual('abc', inst._formatFieldName('abc'));
            });

            describe('auto quote names', () => {
                beforeEach(() => {
                    inst.options.autoQuoteFieldNames = true;
                });

                it('default quote character', () => {
                    areEqual('`abc`.`def`', inst._formatFieldName('abc.def'));
                });

                it('do not quote *', () => {
                    areEqual('`abc`.*', inst._formatFieldName('abc.*'));
                });

                it('custom quote character', () => {
                    inst.options.nameQuoteCharacter = '|';
                    areEqual('|abc|.|def|', inst._formatFieldName('abc.def'));
                });

                it('ignore periods when quoting', () => {
                    areEqual(
                        '`abc.def`',
                        inst._formatFieldName('abc.def', {
                            ignorePeriodsForFieldNameQuotes: true,
                        })
                    );
                });
            });
        });

        describe('_formatCustomValue', () => {
            it('not a custom value type', () => {
                areEqual({ formatted: false, value: null }, inst._formatCustomValue(null));
                areEqual({ formatted: false, value: 'abc' }, inst._formatCustomValue('abc'));
                areEqual({ formatted: false, value: 12 }, inst._formatCustomValue(12));
                areEqual({ formatted: false, value: 1.2 }, inst._formatCustomValue(1.2));
                areEqual({ formatted: false, value: true }, inst._formatCustomValue(true));
                areEqual({ formatted: false, value: false }, inst._formatCustomValue(false));
            });

            describe('custom value type', () => {
                it('global', () => {
                    class MyClass {}
                    const myObj = new MyClass();

                    squel.registerValueHandler(MyClass, () => 3.14);
                    squel.registerValueHandler('boolean', (v) => `a${v}`);

                    areEqual({ formatted: true, value: 3.14 }, inst._formatCustomValue(myObj));
                    areEqual({ formatted: true, value: 'atrue' }, inst._formatCustomValue(true));
                });

                it('instance', () => {
                    class MyClass {}
                    const myObj = new MyClass();

                    inst.registerValueHandler(MyClass, () => 3.14);
                    inst.registerValueHandler('number', (v) => `${v}a`);

                    areEqual({ formatted: true, value: 3.14 }, inst._formatCustomValue(myObj));
                    areEqual({ formatted: true, value: '5.2a' }, inst._formatCustomValue(5.2));
                });

                it('instance handler takes precedence over global', () => {
                    inst.registerValueHandler(Date, (d) => 'hello');
                    squel.registerValueHandler(Date, (d) => 'goodbye');

                    areEqual({ formatted: true, value: 'hello' }, inst._formatCustomValue(new Date()));

                    inst = new BaseBuilder({
                        valueHandlers: [],
                    });
                    areEqual({ formatted: true, value: 'goodbye' }, inst._formatCustomValue(new Date()));
                });

                it('whether to format for parameterized output', () => {
                    inst.registerValueHandler(Date, (d, asParam) => {
                        if (asParam) {
                            return 'foo';
                        }

                        return 'bar';
                    });

                    const val = new Date();

                    areEqual({ formatted: true, value: 'foo' }, inst._formatCustomValue(val, true));
                    areEqual({ formatted: true, value: 'bar' }, inst._formatCustomValue(val));
                });

                it('additional formatting options', () => {
                    inst.registerValueHandler(Date, (d, asParam, options) => {
                        if (options.dontQuote) {
                            return 'foo';
                        }

                        return '"foo"';
                    });

                    const val = new Date();

                    areEqual(
                        { formatted: true, value: 'foo' },
                        inst._formatCustomValue(val, true, {
                            dontQuote: true,
                        })
                    );
                    areEqual(
                        { formatted: true, value: '"foo"' },
                        inst._formatCustomValue(val, true, {
                            dontQuote: false,
                        })
                    );
                });
                it('return raw', () => {
                    inst.registerValueHandler(Date, (d) => ({
                        rawNesting: true,
                        value: 'foo',
                    }));

                    const val = new Date();

                    areEqual({ rawNesting: true, formatted: true, value: 'foo' }, inst._formatCustomValue(val, true));
                });
            });
        });

        describe('_formatValueForParamArray', () => {
            it('Query builder', () => {
                const s = squel.select().from('table');

                areEqual(s, inst._formatValueForParamArray(s));
            });

            it('else calls _formatCustomValue', () => {
                const spy = mocker.stub(inst, '_formatCustomValue', (v, asParam) => ({
                    formatted: true,
                    value: `test${asParam ? 'foo' : 'bar'}`,
                }));

                areEqual('testfoo', inst._formatValueForParamArray(null));
                areEqual('testfoo', inst._formatValueForParamArray('abc'));
                areEqual('testfoo', inst._formatValueForParamArray(12));
                areEqual('testfoo', inst._formatValueForParamArray(1.2));

                const opts = { dummy: true };

                areEqual('testfoo', inst._formatValueForParamArray(true, opts));

                areEqual('testfoo', inst._formatValueForParamArray(false));

                areEqual(6, spy.callCount);

                areEqual(spy.getCall(4).args[2], opts);
            });

            it('Array - recursively calls itself on each element', () => {
                const spy = mocker.spy(inst, '_formatValueForParamArray');

                const v = [squel.select().from('table'), 1.2];

                const opts = { dummy: true };
                const res = inst._formatValueForParamArray(v, opts);

                areEqual(v, res);

                areEqual(3, spy.callCount);
                expect(spy.calledWith(v[0])).toBeTruthy();
                expect(spy.calledWith(v[1])).toBeTruthy();

                areEqual(spy.getCall(1).args[1], opts);
            });
        });

        describe('_formatValueForQueryString', () => {
            it('null', () => {
                areEqual('NULL', inst._formatValueForQueryString(null));
            });

            it('boolean', () => {
                areEqual('TRUE', inst._formatValueForQueryString(true));
                areEqual('FALSE', inst._formatValueForQueryString(false));
            });

            it('integer', () => {
                areEqual(12, inst._formatValueForQueryString(12));
            });

            it('float', () => {
                areEqual(1.2, inst._formatValueForQueryString(1.2));
            });

            describe('string', () => {
                it('have string formatter function', () => {
                    inst.options.stringFormatter = (str) => `N(${str})`;

                    areEqual('N(test)', inst._formatValueForQueryString('test'));
                });

                it('default', () => {
                    let escapedValue;

                    mocker.stub(inst, '_escapeValue', (str) => escapedValue || str);

                    areEqual("'test'", inst._formatValueForQueryString('test'));

                    expect(inst._escapeValue.calledWithExactly('test')).toBeTruthy();
                    escapedValue = 'blah';
                    areEqual("'blah'", inst._formatValueForQueryString('test'));
                });

                it('dont quote', () => {
                    const escapedValue = undefined;

                    mocker.stub(inst, '_escapeValue', (str) => escapedValue || str);

                    areEqual(
                        'test',
                        inst._formatValueForQueryString('test', {
                            dontQuote: true,
                        })
                    );

                    expect(inst._escapeValue.notCalled).toBeTruthy();
                });
            });

            it('Array - recursively calls itself on each element', () => {
                const spy = mocker.spy(inst, '_formatValueForQueryString');

                const expected = "('test', 123, TRUE, 1.2, NULL)";

                areEqual(expected, inst._formatValueForQueryString(['test', 123, true, 1.2, null]));

                areEqual(6, spy.callCount);
                expect(spy.calledWith('test')).toBeTruthy();
                expect(spy.calledWith(123)).toBeTruthy();
                expect(spy.calledWith(true)).toBeTruthy();
                expect(spy.calledWith(1.2)).toBeTruthy();
                expect(spy.calledWith(null)).toBeTruthy();
            });

            it('BaseBuilder', () => {
                const spy = mocker.stub(inst, '_applyNestingFormatting', (v) => `{{${v}}}`);
                const s = squel.select().from('table');

                areEqual('{{SELECT * FROM table}}', inst._formatValueForQueryString(s));
            });

            it('checks to see if it is custom value type first', () => {
                mocker.stub(inst, '_formatCustomValue', (val, asParam) => ({
                    formatted: true,
                    value: 12 + (asParam ? 25 : 65),
                }));
                mocker.stub(inst, '_applyNestingFormatting', (v) => `{${v}}`);
                areEqual('{77}', inst._formatValueForQueryString(123));
            });

            it('#292 - custom value type specifies raw nesting', () => {
                mocker.stub(inst, '_formatCustomValue', (val, asParam) => ({
                    rawNesting: true,
                    formatted: true,
                    value: 12,
                }));
                mocker.stub(inst, '_applyNestingFormatting', (v) => `{${v}}`);
                areEqual(12, inst._formatValueForQueryString(123));
            });
        });

        describe('_applyNestingFormatting', () => {
            it('default()', () => {
                areEqual('(77)', inst._applyNestingFormatting('77'));
                areEqual('((77)', inst._applyNestingFormatting('(77'));
                areEqual('(77))', inst._applyNestingFormatting('77)'));
                areEqual('(77)', inst._applyNestingFormatting('(77)'));
            });
            it('no nesting', () => {
                areEqual('77', inst._applyNestingFormatting('77', false));
            });
            it('rawNesting turned on', () => {
                inst = new BaseBuilder({ rawNesting: true });
                areEqual('77', inst._applyNestingFormatting('77'));
            });
        });

        describe('_buildString', () => {
            it('empty', () => {
                areEqual(inst._buildString(''), {
                    text: '',
                    values: [],
                });
            });
            describe('no params', () => {
                it('non-parameterized', () => {
                    areEqual(inst._buildString('abc = 3', []), {
                        text: 'abc = 3',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildString('abc = 3', [], {
                            buildParameterized: true,
                        }),
                        {
                            text: 'abc = 3',
                            values: [],
                        }
                    );
                });
            });
            describe('non-array', () => {
                it('non-parameterized', () => {
                    areEqual(inst._buildString('a = ? ? ? ?', [2, 'abc', false, null]), {
                        text: "a = 2 'abc' FALSE NULL",
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(inst._buildString('a = ? ? ? ?', [2, 'abc', false, null], { buildParameterized: true }), {
                        text: 'a = ? ? ? ?',
                        values: [2, 'abc', false, null],
                    });
                });
            });
            describe('array', () => {
                it('non-parameterized', () => {
                    areEqual(inst._buildString('a = ?', [[1, 2, 3]]), {
                        text: 'a = (1, 2, 3)',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildString('a = ?', [[1, 2, 3]], {
                            buildParameterized: true,
                        }),
                        {
                            text: 'a = (?, ?, ?)',
                            values: [1, 2, 3],
                        }
                    );
                });
            });
            describe('nested builder', () => {
                beforeEach(() => (testContext.s = squel.select().from('master').where('b = ?', 5)));

                it('non-parameterized', () => {
                    areEqual(inst._buildString('a = ?', [testContext.s]), {
                        text: 'a = (SELECT * FROM master WHERE (b = 5))',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    const result = inst._buildString('a = ?', [testContext.s], {
                        buildParameterized: true,
                    });

                    areEqual(result, {
                        text: 'a = (SELECT * FROM master WHERE (b = ?))',
                        values: [5],
                    });
                });
            });
            describe('return nested output', () => {
                it('non-parameterized', () => {
                    areEqual(inst._buildString('a = ?', [3], { nested: true }), {
                        text: '(a = 3)',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildString('a = ?', [3], {
                            buildParameterized: true,
                            nested: true,
                        }),
                        {
                            text: '(a = ?)',
                            values: [3],
                        }
                    );
                });
            });
            it('string formatting options', () => {
                const options = {
                    formattingOptions: {
                        dontQuote: true,
                    },
                };

                areEqual(inst._buildString('a = ?', ['NOW()'], options), {
                    text: 'a = NOW()',
                    values: [],
                });
            });
            it('passes formatting options even when doing parameterized query', () => {
                const spy = mocker.spy(inst, '_formatValueForParamArray');

                const options = {
                    buildParameterized: true,
                    formattingOptions: {
                        dontQuote: true,
                    },
                };

                inst._buildString('a = ?', [3], options);

                areEqual(spy.getCall(0).args[1], options.formattingOptions);
            });
            describe('custom parameter character', () => {
                beforeEach(() => {
                    inst.options.parameterCharacter = '@@';
                });

                it('non-parameterized', () => {
                    areEqual(inst._buildString('a = @@', [[1, 2, 3]]), {
                        text: 'a = (1, 2, 3)',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildString('a = @@', [[1, 2, 3]], {
                            buildParameterized: true,
                        }),
                        {
                            text: 'a = (@@, @@, @@)',
                            values: [1, 2, 3],
                        }
                    );
                });
            });
        });

        describe('_buildManyStrings', () => {
            it('empty', () => {
                areEqual(inst._buildManyStrings([], []), {
                    text: '',
                    values: [],
                });
            });
            describe('simple', () => {
                beforeEach(() => {
                    testContext.strings = ['a = ?', 'b IN ? AND c = ?'];

                    testContext.values = [['elephant'], [[1, 2, 3], 4]];
                });

                it('non-parameterized', () => {
                    areEqual(inst._buildManyStrings(testContext.strings, testContext.values), {
                        text: "a = 'elephant' b IN (1, 2, 3) AND c = 4",
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildManyStrings(testContext.strings, testContext.values, {
                            buildParameterized: true,
                        }),
                        {
                            text: 'a = ? b IN (?, ?, ?) AND c = ?',
                            values: ['elephant', 1, 2, 3, 4],
                        }
                    );
                });
            });

            describe('return nested', () => {
                it('non-parameterized', () => {
                    areEqual(
                        inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]], {
                            nested: true,
                        }),
                        {
                            text: '(a = 1 b = 2)',
                            values: [],
                        }
                    );
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]], {
                            buildParameterized: true,
                            nested: true,
                        }),
                        {
                            text: '(a = ? b = ?)',
                            values: [1, 2],
                        }
                    );
                });
            });

            describe('custom separator', () => {
                beforeEach(() => {
                    inst.options.separator = '|';
                });
                it('non-parameterized', () => {
                    areEqual(inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]]), {
                        text: 'a = 1|b = 2',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]], {
                            buildParameterized: true,
                        }),
                        {
                            text: 'a = ?|b = ?',
                            values: [1, 2],
                        }
                    );
                });
            });
        });
    });

    describe('QueryBuilder base class', () => {
        beforeEach(() => {
            inst = new QueryBuilder();
        });

        it('instanceof base builder', () => {
            expect(inst).toBeInstanceOf(BaseBuilder);
        });

        describe('constructor', () => {
            it('default options', () => {
                areEqual(DefaultQueryBuilderOptions, inst.options);
            });

            it('overridden options', () => {
                inst = new QueryBuilder({
                    dummy1: 'str',
                    dummy2: 12.3,
                    usingValuePlaceholders: true,
                    dummy3: true,
                });

                const expectedOptions = extend({}, DefaultQueryBuilderOptions, {
                    dummy1: 'str',
                    dummy2: 12.3,
                    usingValuePlaceholders: true,
                    dummy3: true,
                });

                areEqual(expectedOptions, inst.options);
            });

            it('default blocks - none', () => {
                areEqual([], inst.blocks);
            });

            describe('blocks passed in', () => {
                it('exposes block methods', () => {
                    const limitExposedMethodsSpy = mocker.spy(LimitBlock.prototype, 'exposedMethods');
                    const distinctExposedMethodsSpy = mocker.spy(DistinctBlock.prototype, 'exposedMethods');
                    const limitSpy = mocker.spy(LimitBlock.prototype, 'limit');
                    const distinctSpy = mocker.spy(DistinctBlock.prototype, 'distinct');

                    const blocks = [new LimitBlock(), new DistinctBlock()];

                    inst = new QueryBuilder({}, blocks);

                    expect(limitExposedMethodsSpy.calledOnce).toBeTruthy();
                    expect(distinctExposedMethodsSpy.calledOnce).toBeTruthy();

                    expect(typeof inst.distinct).toBe('function');
                    expect(typeof inst.limit).toBe('function');

                    areEqual(inst, inst.limit(2));
                    expect(limitSpy.calledOnce).toBeTruthy();
                    expect(limitSpy.calledOn(blocks[0])).toBeTruthy();

                    areEqual(inst, inst.distinct());
                    expect(distinctSpy.calledOnce).toBeTruthy();
                    expect(distinctSpy.calledOn(blocks[1])).toBeTruthy();
                });

                it('cannot expose the same method twice', () => {
                    const blocks = [new DistinctBlock(), new DistinctBlock()];

                    try {
                        inst = new QueryBuilder({}, blocks);
                        throw new Error('should not reach here');
                    } catch (err) {
                        areEqual('Error: Builder already has a builder method called: distinct', err.toString());
                    }
                });
            });
        });

        describe('updateOptions()', () => {
            it('updates query builder options', () => {
                const oldOptions = extend({}, inst.options);

                inst.updateOptions({
                    updated: false,
                });

                const expected = extend(oldOptions, { updated: false });

                areEqual(expected, inst.options);
            });

            it('updates building block options', () => {
                inst.blocks = [new Block()];

                const oldOptions = extend({}, inst.blocks[0].options);

                inst.updateOptions({
                    updated: false,
                });

                const expected = extend(oldOptions, { updated: false });

                areEqual(expected, inst.blocks[0].options);
            });
        });

        describe('toString()', () => {
            it('returns empty if no blocks', () => {
                areEqual('', inst.toString());
            });

            it('skips empty block strings', () => {
                inst.blocks = [new StringBlock({}, '')];

                areEqual('', inst.toString());
            });

            it('returns final query string', () => {
                let i = 1;
                const toStringSpy = mocker.stub(StringBlock.prototype, '_toParamString', () => ({
                    text: `ret${++i}`,
                    values: [],
                }));

                inst.blocks = [new StringBlock({}, 'STR1'), new StringBlock({}, 'STR2'), new StringBlock({}, 'STR3')];

                areEqual('ret2 ret3 ret4', inst.toString());

                expect(toStringSpy.calledThrice).toBeTruthy();
                expect(toStringSpy.calledOn(inst.blocks[0])).toBeTruthy();
                expect(toStringSpy.calledOn(inst.blocks[1])).toBeTruthy();
                expect(toStringSpy.calledOn(inst.blocks[2])).toBeTruthy();
            });
        });

        describe('toParam()', () => {
            it('returns empty if no blocks', () => {
                areEqual({ text: '', values: [] }, inst.toParam());
            });

            it('skips empty block strings', () => {
                inst.blocks = [new StringBlock({}, '')];

                areEqual({ text: '', values: [] }, inst.toParam());
            });

            it('returns final query string', () => {
                inst.blocks = [new StringBlock({}, 'STR1'), new StringBlock({}, 'STR2'), new StringBlock({}, 'STR3')];

                let i = 1;
                const toStringSpy = mocker.stub(StringBlock.prototype, '_toParamString', () => ({
                    text: `ret${++i}`,
                    values: [],
                }));

                areEqual({ text: 'ret2 ret3 ret4', values: [] }, inst.toParam());

                expect(toStringSpy.calledThrice).toBeTruthy();
                expect(toStringSpy.calledOn(inst.blocks[0])).toBeTruthy();
                expect(toStringSpy.calledOn(inst.blocks[1])).toBeTruthy();
                expect(toStringSpy.calledOn(inst.blocks[2])).toBeTruthy();
            });

            it('returns query with unnumbered parameters', () => {
                inst.blocks = [new WhereBlock({})];

                inst.blocks[0]._toParamString = mocker.spy(() => ({
                    text: 'a = ? AND b in (?, ?)',
                    values: [1, 2, 3],
                }));

                areEqual({ text: 'a = ? AND b in (?, ?)', values: [1, 2, 3] }, inst.toParam());
            });

            it('returns query with numbered parameters', () => {
                inst = new QueryBuilder({
                    numberedParameters: true,
                });

                inst.blocks = [new WhereBlock({})];

                mocker.stub(WhereBlock.prototype, '_toParamString', () => ({
                    text: 'a = ? AND b in (?, ?)',
                    values: [1, 2, 3],
                }));

                areEqual(inst.toParam(), {
                    text: 'a = $1 AND b in ($2, $3)',
                    values: [1, 2, 3],
                });
            });

            it('returns query with numbered parameters and custom prefix', () => {
                inst = new QueryBuilder({
                    numberedParameters: true,
                    numberedParametersPrefix: '&%',
                    numberedParametersStartAt: undefined,
                });

                inst.blocks = [new WhereBlock({})];

                mocker.stub(WhereBlock.prototype, '_toParamString', () => ({
                    text: 'a = ? AND b in (?, ?)',
                    values: [1, 2, 3],
                }));

                areEqual(inst.toParam(), {
                    text: 'a = &%1 AND b in (&%2, &%3)',
                    values: [1, 2, 3],
                });
            });
        });

        describe('cloning', () => {
            it('blocks get cloned properly', () => {
                const blockCloneSpy = mocker.spy(StringBlock.prototype, 'clone');

                inst.blocks = [new StringBlock({}, 'TEST')];

                const newinst = inst.clone();

                inst.blocks[0].str = 'TEST2';

                areEqual('TEST', newinst.blocks[0].toString());
            });
        });

        describe('registerValueHandler', () => {
            let originalHandlers;

            it('beforEach', () => {
                originalHandlers = [].concat(squel.globalValueHandlers);
            });
            it('afterEach', () => {
                squel.globalValueHandlers = originalHandlers;
            });

            it('calls through to base class method', () => {
                const baseBuilderSpy = mocker.spy(BaseBuilder.prototype, 'registerValueHandler');

                const handler = () => 'test';

                inst.registerValueHandler(Date, handler);
                inst.registerValueHandler('number', handler);

                expect(baseBuilderSpy.calledTwice).toBeTruthy();
                expect(baseBuilderSpy.calledOn(inst)).toBeTruthy();
            });

            it('returns instance for chainability', () => {
                const handler = () => 'test';

                areEqual(inst, inst.registerValueHandler(Date, handler));
            });

            it('calls through to blocks', () => {
                inst.blocks = [new StringBlock({}, '')];

                const baseBuilderSpy = mocker.spy(inst.blocks[0], 'registerValueHandler');

                const handler = () => 'test';

                inst.registerValueHandler(Date, handler);

                expect(baseBuilderSpy.calledOnce).toBeTruthy();
                expect(baseBuilderSpy.calledOn(inst.blocks[0])).toBeTruthy();
            });
        });

        describe('get block', () => {
            it('valid', () => {
                const block = new FunctionBlock();

                inst.blocks.push(block);
                areEqual(block, inst.getBlock(FunctionBlock));
            });
            it('invalid', () => {
                areEqual(undefined, inst.getBlock(FunctionBlock));
            });
        });
    });
});
