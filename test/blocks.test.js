import sinon from 'sinon';
import { extend } from 'lodash';
import squel from '../src';
import {
    FunctionBlock,
    OrderByBlock,
    HavingBlock,
    FromTableBlock,
    TargetTableBlock,
    LimitBlock,
    GroupByBlock,
    DistinctBlock,
    InsertFieldsFromQueryBlock,
    InsertFieldValueBlock,
    IntoTableBlock,
    OffsetBlock,
    GetFieldBlock,
    WhereBlock,
    JoinBlock,
    StringBlock,
    Block,
} from '../src/block';
import { AbstractConditionBlock } from '../src/block/abstract-condition-block';
import { AbstractVerbSingleValueBlock } from '../src/block/abstract-verb-single-value-block';
import { AbstractSetFieldBlock } from '../src/block/abstract-set-field-block';
import { DefaultQueryBuilderOptions } from '../src/base-builder';
import { AbstractTableBlock } from '../src/block/abstract-table-block';
import { SetFieldBlock } from '../src/block/set-field-block';
import { Select } from '../src/methods/select';
import { UpdateTableBlock } from '../src/block/update-table-block';

let mocker;
let inst = new Block();

const areEqual = function (actual, expected, message) {
    return expect(actual).toEqual(expected);
};

describe('Blocks', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
        mocker = sinon.sandbox.create();
    });

    afterEach(() => {
        mocker.restore();
    });
    describe('Block base class', () => {
        beforeEach(() => {
            return (inst = new Block());
        });

        it('instanceof of BaseBuilder', () => {
            const expectedOptions = extend({}, DefaultQueryBuilderOptions, {
                usingValuePlaceholders: true,
                dummy: true,
            });

            inst = new Block({
                usingValuePlaceholders: true,
                dummy: true,
            });

            areEqual(expectedOptions, inst.options);
        });

        describe('exposedMethods()', () => {
            it('returns methods', () => {
                inst['method1'] = () => false;
                inst['method2'] = () => false;

                expect(['method1', 'method2']).toBeTruthy();
            });

            it('ignores methods prefixed with _', () => {
                let name;

                inst['_method'] = () => false;

                expect(
                    undefined ===
                        (() => {
                            const result = [];

                            for (name in inst.exposedMethods()) {
                                result.push(name);
                            }

                            return result;
                        })().find((name) => name === '_method')
                ).toBeTruthy();
            });

            it('ignores toString()', () => {
                let name;

                expect(
                    undefined ===
                        (() => {
                            const result = [];

                            for (name in inst.exposedMethods()) {
                                result.push(name);
                            }

                            return result;
                        })().find((name) => name === 'toString')
                ).toBeTruthy();
            });
        });

        it('cloning copies the options over', () => {
            inst.options.dummy = true;

            const newinst = inst.clone();

            inst.options.dummy = false;

            areEqual(true, newinst.options.dummy);
        });
    });

    describe('StringBlock', () => {
        beforeEach(() => {
            testContext.cls = StringBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('_toParamString()', () => {
            it('non-parameterized', () => {
                inst = new testContext.cls({}, 'TAG');

                areEqual(inst._toParamString(), {
                    text: 'TAG',
                    values: [],
                });
            });
            it('parameterized', () => {
                inst = new testContext.cls({}, 'TAG');

                areEqual(inst._toParamString({ buildParameterized: true }), {
                    text: 'TAG',
                    values: [],
                });
            });
        });
    });

    describe('FunctionBlock', () => {
        beforeEach(() => {
            testContext.cls = FunctionBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        it('initial member values', () => {
            areEqual([], inst._values);
            areEqual([], inst._strings);
        });

        describe('_toParamString()', () => {
            it('when not set', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });
            it('non-parameterized', () => {
                inst.function('bla');
                inst.function('bla2');

                areEqual(inst._toParamString(), {
                    text: 'bla bla2',
                    values: [],
                });
            });
            it('parameterized', () => {
                inst.function('bla ?', 2);
                inst.function('bla2 ?', 3);

                areEqual(inst._toParamString({ buildParameterized: true }), {
                    text: 'bla ? bla2 ?',
                    values: [2, 3],
                });
            });
        });
    });

    describe('AbstractTableBlock', () => {
        beforeEach(() => {
            testContext.cls = AbstractTableBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        it('initial field values', () => {
            areEqual([], inst._tables);
        });

        describe('has table', () => {
            it('no', () => {
                areEqual(false, inst._hasTable());
            });
            it('yes', () => {
                inst._table('blah');
                areEqual(true, inst._hasTable());
            });
        });

        describe('_table()', () => {
            it('saves inputs', () => {
                inst._table('table1');
                inst._table('table2', 'alias2');
                inst._table('table3');

                const expectedFroms = [
                    {
                        table: 'table1',
                        alias: null,
                    },
                    {
                        table: 'table2',
                        alias: 'alias2',
                    },
                    {
                        table: 'table3',
                        alias: null,
                    },
                ];

                areEqual(expectedFroms, inst._tables);
            });

            it('sanitizes inputs', () => {
                const sanitizeTableSpy = mocker.stub(testContext.cls.prototype, '_sanitizeTable', () => '_t');
                const sanitizeAliasSpy = mocker.stub(testContext.cls.prototype, '_sanitizeTableAlias', () => '_a');

                inst._table('table', 'alias');

                expect(sanitizeTableSpy.calledWith('table')).toBeTruthy();
                expect(sanitizeAliasSpy.calledWithExactly('alias')).toBeTruthy();

                areEqual([{ table: '_t', alias: '_a' }], inst._tables);
            });

            it('handles single-table mode', () => {
                inst.options.singleTable = true;

                inst._table('table1');
                inst._table('table2');
                inst._table('table3');

                const expected = [
                    {
                        table: 'table3',
                        alias: null,
                    },
                ];

                areEqual(expected, inst._tables);
            });

            it('builder as table', () => {
                const sanitizeTableSpy = mocker.spy(testContext.cls.prototype, '_sanitizeTable');

                const innerTable1 = squel.select();
                const innerTable2 = squel.select();

                inst._table(innerTable1);
                inst._table(innerTable2, 'Inner2');

                expect(sanitizeTableSpy.calledWithExactly(innerTable1)).toBeTruthy();
                expect(sanitizeTableSpy.calledWithExactly(innerTable2)).toBeTruthy();

                const expected = [
                    {
                        alias: null,
                        table: innerTable1,
                    },
                    {
                        alias: 'Inner2',
                        table: innerTable2,
                    },
                ];

                areEqual(expected, inst._tables);
            });
        });

        describe('_toParamString()', () => {
            beforeEach(() => {
                return (testContext.innerTable1 = squel.select().from('inner1').where('a = ?', 3));
            });

            it('no table', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });

            it('prefix', () => {
                inst.options.prefix = 'TEST';

                inst._table('table2', 'alias2');

                areEqual(inst._toParamString(), {
                    text: 'TEST table2 `alias2`',
                    values: [],
                });
            });

            it('non-parameterized', () => {
                inst._table(testContext.innerTable1);
                inst._table('table2', 'alias2');
                inst._table('table3');

                areEqual(inst._toParamString(), {
                    text: '(SELECT * FROM inner1 WHERE (a = 3)), table2 `alias2`, table3',
                    values: [],
                });
            });
            it('parameterized', () => {
                inst._table(testContext.innerTable1);
                inst._table('table2', 'alias2');
                inst._table('table3');

                areEqual(inst._toParamString({ buildParameterized: true }), {
                    text: '(SELECT * FROM inner1 WHERE (a = ?)), table2 `alias2`, table3',
                    values: [3],
                });
            });
        });
    });

    describe('FromTableBlock', () => {
        beforeEach(() => {
            testContext.cls = FromTableBlock;
            inst = new testContext.cls();
        });

        it('check prefix', () => {
            areEqual(inst.options.prefix, 'FROM');
        });

        it('instanceof of AbstractTableBlock', () => {
            expect(inst).toBeInstanceOf(AbstractTableBlock);
        });

        describe('from()', () => {
            it('calls base class handler', () => {
                const baseMethodSpy = mocker.stub(AbstractTableBlock.prototype, '_table');

                inst.from('table1');
                inst.from('table2', 'alias2');

                areEqual(2, baseMethodSpy.callCount);
                expect(baseMethodSpy.calledWithExactly('table1', null)).toBeTruthy();
                expect(baseMethodSpy.calledWithExactly('table2', 'alias2')).toBeTruthy();
            });
        });
    });

    describe('UpdateTableBlock', () => {
        beforeEach(() => {
            testContext.cls = UpdateTableBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractTableBlock', () => {
            expect(inst).toBeInstanceOf(AbstractTableBlock);
        });

        it('check prefix', () => {
            areEqual(inst.options.prefix, undefined);
        });

        describe('table()', () => {
            it('calls base class handler', () => {
                const baseMethodSpy = mocker.stub(AbstractTableBlock.prototype, '_table');

                inst.table('table1');
                inst.table('table2', 'alias2');

                areEqual(2, baseMethodSpy.callCount);
                expect(baseMethodSpy.calledWithExactly('table1', null)).toBeTruthy();
                expect(baseMethodSpy.calledWithExactly('table2', 'alias2')).toBeTruthy();
            });
        });
    });

    describe('TargetTableBlock', () => {
        beforeEach(() => {
            testContext.cls = TargetTableBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractTableBlock', () => {
            expect(inst).toBeInstanceOf(AbstractTableBlock);
        });

        it('check prefix', () => {
            areEqual(inst.options.prefix, undefined);
        });

        describe('table()', () => {
            it('calls base class handler', () => {
                const baseMethodSpy = mocker.stub(AbstractTableBlock.prototype, '_table');

                inst.target('table1');
                inst.target('table2');

                areEqual(2, baseMethodSpy.callCount);
                expect(baseMethodSpy.calledWithExactly('table1')).toBeTruthy();
                expect(baseMethodSpy.calledWithExactly('table2')).toBeTruthy();
            });
        });
    });

    describe('IntoTableBlock', () => {
        beforeEach(() => {
            testContext.cls = IntoTableBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractTableBlock', () => {
            expect(inst).toBeInstanceOf(AbstractTableBlock);
        });

        it('check prefix', () => {
            areEqual(inst.options.prefix, 'INTO');
        });

        it('single table', () => {
            expect(inst.options.singleTable).toBeTruthy();
        });

        describe('into()', () => {
            it('calls base class handler', () => {
                const baseMethodSpy = mocker.stub(AbstractTableBlock.prototype, '_table');

                inst.into('table1');
                inst.into('table2');

                areEqual(2, baseMethodSpy.callCount);
                expect(baseMethodSpy.calledWith('table1')).toBeTruthy();
                expect(baseMethodSpy.calledWith('table2')).toBeTruthy();
            });
        });

        describe('_toParamString()', () => {
            it('requires table to have been provided', () => {
                try {
                    inst._toParamString();
                    throw new Error('should not reach here');
                } catch (err) {
                    areEqual('Error: into() needs to be called', err.toString());
                }
            });
        });
    });

    describe('GetFieldBlock', () => {
        beforeEach(() => {
            testContext.cls = GetFieldBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('fields() - object', () => {
            it('saves inputs', () => {
                const fieldSpy = mocker.spy(inst, 'field');

                inst.fields(
                    {
                        field1: null,
                        field2: 'alias2',
                        field3: null,
                    },
                    {
                        dummy: true,
                    }
                );

                const expected = [
                    {
                        name: 'field1',
                        alias: null,
                        options: {
                            dummy: true,
                        },
                    },
                    {
                        name: 'field2',
                        alias: 'alias2',
                        options: {
                            dummy: true,
                        },
                    },
                    {
                        name: 'field3',
                        alias: null,
                        options: {
                            dummy: true,
                        },
                    },
                ];

                expect(fieldSpy.calledThrice).toBeTruthy();
                expect(
                    fieldSpy.calledWithExactly('field1', null, {
                        dummy: true,
                    })
                ).toBeTruthy();
                expect(
                    fieldSpy.calledWithExactly('field2', 'alias2', {
                        dummy: true,
                    })
                ).toBeTruthy();
                expect(
                    fieldSpy.calledWithExactly('field3', null, {
                        dummy: true,
                    })
                ).toBeTruthy();

                areEqual(expected, inst._fields);
            });
        });

        describe('fields() - array', () => {
            it('saves inputs', () => {
                const fieldSpy = mocker.spy(inst, 'field');

                inst.fields(['field1', 'field2', 'field3'], {
                    dummy: true,
                });

                const expected = [
                    {
                        name: 'field1',
                        alias: null,
                        options: {
                            dummy: true,
                        },
                    },
                    {
                        name: 'field2',
                        alias: null,
                        options: {
                            dummy: true,
                        },
                    },
                    {
                        name: 'field3',
                        alias: null,
                        options: {
                            dummy: true,
                        },
                    },
                ];

                expect(fieldSpy.calledThrice).toBeTruthy();
                expect(
                    fieldSpy.calledWithExactly('field1', null, {
                        dummy: true,
                    })
                ).toBeTruthy();
                expect(
                    fieldSpy.calledWithExactly('field2', null, {
                        dummy: true,
                    })
                ).toBeTruthy();
                expect(
                    fieldSpy.calledWithExactly('field3', null, {
                        dummy: true,
                    })
                ).toBeTruthy();

                areEqual(expected, inst._fields);
            });
        });

        describe('field()', () => {
            it('saves inputs', () => {
                inst.field('field1');
                inst.field('field2', 'alias2');
                inst.field('field3');

                const expected = [
                    {
                        name: 'field1',
                        alias: null,
                        options: {},
                    },
                    {
                        name: 'field2',
                        alias: 'alias2',
                        options: {},
                    },
                    {
                        name: 'field3',
                        alias: null,
                        options: {},
                    },
                ];

                areEqual(expected, inst._fields);
            });
        });

        describe('field() - discard duplicates', () => {
            it('saves inputs', () => {
                inst.field('field1');
                inst.field('field2', 'alias2');
                inst.field('field2', 'alias2');
                inst.field('field1', 'alias1');

                const expected = [
                    {
                        name: 'field1',
                        alias: null,
                        options: {},
                    },
                    {
                        name: 'field2',
                        alias: 'alias2',
                        options: {},
                    },
                    {
                        name: 'field1',
                        alias: 'alias1',
                        options: {},
                    },
                ];

                areEqual(expected, inst._fields);
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeField', () => '_f');
                const sanitizeAliasSpy = mocker.stub(testContext.cls.prototype, '_sanitizeFieldAlias', () => '_a');

                inst.field('field1', 'alias1', { dummy: true });

                expect(sanitizeFieldSpy.calledWithExactly('field1')).toBeTruthy();
                expect(sanitizeAliasSpy.calledWithExactly('alias1')).toBeTruthy();

                areEqual(inst._fields, [
                    {
                        name: '_f',
                        alias: '_a',
                        options: {
                            dummy: true,
                        },
                    },
                ]);
            });
        });

        describe('_toParamString()', () => {
            beforeEach(() => {
                testContext.queryBuilder = squel.select();

                return (testContext.fromTableBlock = testContext.queryBuilder.getBlock(FromTableBlock));
            });

            it('returns all fields when none provided and table is set', () => {
                testContext.fromTableBlock._hasTable = () => true;

                areEqual(
                    inst._toParamString({
                        queryBuilder: testContext.queryBuilder,
                    }),
                    {
                        text: '*',
                        values: [],
                    }
                );
            });

            it('but returns nothing if no table set', () => {
                testContext.fromTableBlock._hasTable = () => false;

                areEqual(
                    inst._toParamString({
                        queryBuilder: testContext.queryBuilder,
                    }),
                    {
                        text: '',
                        values: [],
                    }
                );
            });

            describe('returns formatted query phrase', () => {
                beforeEach(() => {
                    testContext.fromTableBlock._hasTable = () => true;
                    inst.field(squel.str('GETDATE(?)', 3), 'alias1');
                    inst.field('field2', 'alias2', { dummy: true });
                    inst.field('field3');
                });
                it('non-parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            queryBuilder: testContext.queryBuilder,
                        }),
                        {
                            text: '(GETDATE(3)) AS "alias1", field2 AS "alias2", field3',
                            values: [],
                        }
                    );
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            queryBuilder: testContext.queryBuilder,
                            buildParameterized: true,
                        }),
                        {
                            text: '(GETDATE(?)) AS "alias1", field2 AS "alias2", field3',
                            values: [3],
                        }
                    );
                });
            });
        });
    });

    describe('AbstractSetFieldBlock', () => {
        beforeEach(() => {
            testContext.cls = AbstractSetFieldBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('_set()', () => {
            it('should throw an error if field values are called first', () => {
                inst._setFieldsRows([
                    {
                        field1: 'value1',
                        field2: 'value2',
                        field3: 'value3',
                    },
                    {
                        field1: 'value21',
                        field2: 'value22',
                        field3: 'value23',
                    },
                ]);

                expect(() => inst._set('field1', 'value1', { dummy: true })).toThrowError(
                    'Cannot set multiple rows of fields this way.'
                );
            });

            it('saves inputs', () => {
                inst._set('field1', 'value1', { dummy: 1 });
                inst._set('field2', 'value2', { dummy: 2 });
                inst._set('field3', 'value3', { dummy: 3 });
                inst._set('field4');

                const expectedFields = ['field1', 'field2', 'field3', 'field4'];
                const expectedValues = [['value1', 'value2', 'value3', undefined]];
                const expectedFieldOptions = [[{ dummy: 1 }, { dummy: 2 }, { dummy: 3 }, {}]];

                areEqual(expectedFields, inst._fields);
                areEqual(expectedValues, inst._values);
                areEqual(expectedFieldOptions, inst._valueOptions);
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeField', () => '_f');
                const sanitizeValueSpy = mocker.stub(testContext.cls.prototype, '_sanitizeValue', () => '_v');

                inst._set('field1', 'value1', { dummy: true });

                expect(sanitizeFieldSpy.calledWithExactly('field1')).toBeTruthy();
                expect(sanitizeValueSpy.calledWithExactly('value1')).toBeTruthy();

                areEqual(['_f'], inst._fields);
                areEqual([['_v']], inst._values);
            });
        });

        describe('_setFields()', () => {
            it('should throw an error if set fields called with undefined', () => {
                expect(() => {
                    inst._setFields();
                }).toThrowError(`Expected an object but got undefined`);
            });

            it('saves inputs', () => {
                inst._setFields({
                    field1: 'value1',
                    field2: 'value2',
                    field3: 'value3',
                });

                const expectedFields = ['field1', 'field2', 'field3'];
                const expectedValues = [['value1', 'value2', 'value3']];
                const expectedFieldOptions = [[{}, {}, {}]];

                areEqual(expectedFields, inst._fields);
                areEqual(expectedValues, inst._values);
                areEqual(expectedFieldOptions, inst._valueOptions);
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeField', () => '_f');
                const sanitizeValueSpy = mocker.stub(testContext.cls.prototype, '_sanitizeValue', () => '_v');

                inst._setFields({ field1: 'value1' }, { dummy: true });

                expect(sanitizeFieldSpy.calledWithExactly('field1')).toBeTruthy();
                expect(sanitizeValueSpy.calledWithExactly('value1')).toBeTruthy();

                areEqual(['_f'], inst._fields);
                areEqual([['_v']], inst._values);
            });
        });

        describe('_setFieldsRows()', () => {
            it('should throw an error if rows no an array', () => {
                expect(() => inst._setFieldsRows()).toThrowError('Expected an array of objects but got undefined');
            });

            it('saves inputs', () => {
                inst._setFieldsRows([
                    {
                        field1: 'value1',
                        field2: 'value2',
                        field3: 'value3',
                    },
                    {
                        field1: 'value21',
                        field2: 'value22',
                        field3: 'value23',
                    },
                ]);

                const expectedFields = ['field1', 'field2', 'field3'];
                const expectedValues = [
                    ['value1', 'value2', 'value3'],
                    ['value21', 'value22', 'value23'],
                ];
                const expectedFieldOptions = [
                    [{}, {}, {}],
                    [{}, {}, {}],
                ];

                areEqual(expectedFields, inst._fields);
                areEqual(expectedValues, inst._values);
                areEqual(expectedFieldOptions, inst._valueOptions);
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeField', () => '_f');
                const sanitizeValueSpy = mocker.stub(testContext.cls.prototype, '_sanitizeValue', () => '_v');

                inst._setFieldsRows(
                    [
                        {
                            field1: 'value1',
                        },
                        {
                            field1: 'value21',
                        },
                    ],
                    { dummy: true }
                );

                expect(sanitizeFieldSpy.calledWithExactly('field1')).toBeTruthy();
                expect(sanitizeValueSpy.calledWithExactly('value1')).toBeTruthy();
                expect(sanitizeValueSpy.calledWithExactly('value21')).toBeTruthy();

                areEqual(['_f'], inst._fields);
                areEqual([['_v'], ['_v']], inst._values);
            });
        });

        it('_toParamString()', () => {
            expect(() => inst._toParamString()).toThrow();
        });
    });

    describe('SetFieldBlock', () => {
        beforeEach(() => {
            return (inst = new SetFieldBlock());
        });

        it('instanceof of AbstractSetFieldBlock', () => {
            expect(inst).toBeInstanceOf(AbstractSetFieldBlock);
        });

        describe('set()', () => {
            it('calls to _set()', () => {
                const spy = mocker.stub(inst, '_set');

                inst.set('f', 'v', { dummy: true });

                expect(spy.calledWithExactly('f', 'v', { dummy: true })).toBeTruthy();
            });
        });

        describe('setFields()', () => {
            it('calls to _setFields()', () => {
                const spy = mocker.stub(inst, '_setFields');

                inst.setFields('f', { dummy: true });

                expect(spy.calledWithExactly('f', { dummy: true })).toBeTruthy();
            });
        });

        describe('_toParamString()', () => {
            it('needs at least one field to have been provided', () => {
                try {
                    inst.toString();
                    throw new Error('should not reach here');
                } catch (err) {
                    areEqual('Error: set() needs to be called', err.toString());
                }
            });

            describe('fields set', () => {
                beforeEach(() => {
                    inst.set('field0 = field0 + 1');
                    inst.set('field1', 'value1', { dummy: true });
                    inst.set('field2', 'value2');
                    inst.set('field3', squel.str('GETDATE(?)', 4));
                });
                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: "SET field0 = field0 + 1, field1 = 'value1', field2 = 'value2', field3 = (GETDATE(4))",
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: 'SET field0 = field0 + 1, field1 = ?, field2 = ?, field3 = (GETDATE(?))',
                            values: ['value1', 'value2', 4],
                        }
                    );
                });
            });
        });
    });

    describe('InsertFieldValueBlock', () => {
        beforeEach(() => {
            testContext.cls = InsertFieldValueBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractSetFieldBlock', () => {
            expect(inst).toBeInstanceOf(AbstractSetFieldBlock);
        });

        describe('set()', () => {
            it('calls to _set()', () => {
                const spy = mocker.stub(inst, '_set');

                inst.set('f', 'v', { dummy: true });

                expect(spy.calledWithExactly('f', 'v', { dummy: true })).toBeTruthy();
            });
        });

        describe('setFields()', () => {
            it('calls to _setFields()', () => {
                const spy = mocker.stub(inst, '_setFields');

                inst.setFields('f', { dummy: true });

                expect(spy.calledWithExactly('f', { dummy: true })).toBeTruthy();
            });
        });

        describe('setFieldsRows()', () => {
            it('calls to _setFieldsRows()', () => {
                const spy = mocker.stub(inst, '_setFieldsRows');

                inst.setFieldsRows('f', { dummy: true });

                expect(spy.calledWithExactly('f', { dummy: true })).toBeTruthy();
            });
        });

        describe('_toParamString()', () => {
            it('needs at least one field to have been provided', () => {
                areEqual('', inst.toString());
            });

            describe('got fields', () => {
                beforeEach(() => {
                    inst.setFieldsRows([
                        {
                            field1: 9,
                            field2: 'value2',
                            field3: squel.str('GETDATE(?)', 5),
                        },
                        { field1: 8, field2: true, field3: null },
                    ]);
                });
                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: "(field1, field2, field3) VALUES (9, 'value2', (GETDATE(5))), (8, TRUE, NULL)",
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: '(field1, field2, field3) VALUES (?, ?, (GETDATE(?))), (?, ?, ?)',
                            values: [9, 'value2', 5, 8, true, null],
                        }
                    );
                });
            });
        });
    });

    describe('InsertFieldsFromQueryBlock', () => {
        beforeEach(() => {
            testContext.cls = InsertFieldsFromQueryBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('fromQuery()', () => {
            it('sanitizes field names', () => {
                const spy = mocker.stub(inst, '_sanitizeField', () => 1);

                const qry = squel.select();

                inst.fromQuery(['test', 'one', 'two'], qry);

                expect(spy.calledThrice).toBeTruthy();
                expect(spy.calledWithExactly('test')).toBeTruthy();
                expect(spy.calledWithExactly('one')).toBeTruthy();
                expect(spy.calledWithExactly('two')).toBeTruthy();
            });

            it('sanitizes query', () => {
                const spy = mocker.stub(inst, '_sanitizeBaseBuilder', () => 1);

                const qry = 123;

                inst.fromQuery(['test', 'one', 'two'], qry);

                expect(spy.calledOnce).toBeTruthy();
                expect(spy.calledWithExactly(qry)).toBeTruthy();
            });

            it('overwrites existing values', () => {
                inst._fields = 1;
                inst._query = 2;

                const qry = squel.select();

                inst.fromQuery(['test', 'one', 'two'], qry);

                areEqual(qry, inst._query);
                areEqual(['test', 'one', 'two'], inst._fields);
            });
        });

        describe('_toParamString()', () => {
            it('needs fromQuery() to have been called', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });

            describe('default', () => {
                beforeEach(() => {
                    testContext.qry = squel.select().from('mega').where('a = ?', 5);
                    inst.fromQuery(['test', 'one', 'two'], testContext.qry);
                });
                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: '(test, one, two) (SELECT * FROM mega WHERE (a = 5))',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: '(test, one, two) (SELECT * FROM mega WHERE (a = ?))',
                            values: [5],
                        }
                    );
                });
            });
        });
    });

    describe('DistinctBlock', () => {
        beforeEach(() => {
            testContext.cls = DistinctBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('_toParamString()', () => {
            it('output nothing if not set', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });
            it('output DISTINCT if set', () => {
                inst.distinct();
                areEqual(inst._toParamString(), {
                    text: 'DISTINCT',
                    values: [],
                });
            });
        });
    });

    describe('GroupByBlock', () => {
        beforeEach(() => {
            testContext.cls = GroupByBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('group()', () => {
            it('adds to list', () => {
                inst.group('field1');
                inst.group('field2');

                areEqual(['field1', 'field2'], inst._groups);
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeField', () => '_f');

                inst.group('field1');

                expect(sanitizeFieldSpy.calledWithExactly('field1')).toBeTruthy();

                areEqual(['_f'], inst._groups);
            });
        });

        describe('toString()', () => {
            it('output nothing if no fields set', () => {
                inst._groups = [];
                areEqual('', inst.toString());
            });

            it('output GROUP BY', () => {
                inst.group('field1');
                inst.group('field2');

                areEqual('GROUP BY field1, field2', inst.toString());
            });
        });
    });

    describe('AbstractVerbSingleValueBlock', () => {
        beforeEach(() => {
            testContext.cls = AbstractVerbSingleValueBlock;
            inst = new testContext.cls({
                verb: 'TEST',
            });
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('offset()', () => {
            it('set value', () => {
                inst._setValue(1);

                areEqual(1, inst._value);

                inst._setValue(22);

                areEqual(22, inst._value);
            });

            it('sanitizes inputs', () => {
                const sanitizeSpy = mocker.stub(testContext.cls.prototype, '_sanitizeLimitOffset', () => 234);

                inst._setValue(23);

                expect(sanitizeSpy.calledWithExactly(23)).toBeTruthy();

                areEqual(234, inst._value);
            });
        });

        describe('toString()', () => {
            it('output nothing if not set', () => {
                areEqual('', inst.toString());
            });

            it('output verb', () => {
                inst._setValue(12);

                areEqual('TEST 12', inst.toString());
            });
        });

        describe('toParam()', () => {
            it('output nothing if not set', () => {
                areEqual({ text: '', values: [] }, inst.toParam());
            });

            it('output verb', () => {
                inst._setValue(12);

                areEqual({ text: 'TEST ?', values: [12] }, inst.toParam());
            });
        });
    });

    describe('OffsetBlock', () => {
        beforeEach(() => {
            testContext.cls = OffsetBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractVerbSingleValueBlock', () => {
            expect(inst).toBeInstanceOf(AbstractVerbSingleValueBlock);
        });

        describe('offset()', () => {
            it('calls base method', () => {
                const callSpy = mocker.spy(testContext.cls.prototype, '_setValue');

                inst.offset(1);

                expect(callSpy.calledWithExactly(1)).toBeTruthy();
            });
        });

        describe('toString()', () => {
            it('output nothing if not set', () => {
                areEqual('', inst.toString());
            });

            it('output verb', () => {
                inst.offset(12);

                areEqual('OFFSET 12', inst.toString());
            });
        });

        describe('toParam()', () => {
            it('output nothing if not set', () => {
                areEqual({ text: '', values: [] }, inst.toParam());
            });

            it('output verb', () => {
                inst.offset(12);

                areEqual({ text: 'OFFSET ?', values: [12] }, inst.toParam());
            });
        });

        it('can be removed using null', () => {
            inst.offset(1);
            inst.offset(null);

            areEqual({ text: '', values: [] }, inst.toParam());
        });
    });

    describe('LimitBlock', () => {
        beforeEach(() => {
            testContext.cls = LimitBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractVerbSingleValueBlock', () => {
            expect(inst).toBeInstanceOf(AbstractVerbSingleValueBlock);
        });

        describe('limit()', () => {
            it('calls base method', () => {
                const callSpy = mocker.spy(testContext.cls.prototype, '_setValue');

                inst.limit(1);

                expect(callSpy.calledWithExactly(1)).toBeTruthy();
            });
        });

        describe('toString()', () => {
            it('output nothing if not set', () => {
                areEqual('', inst.toString());
            });

            it('output verb', () => {
                inst.limit(12);

                areEqual('LIMIT 12', inst.toString());
            });
        });

        describe('toParam()', () => {
            it('output nothing if not set', () => {
                areEqual({ text: '', values: [] }, inst.toParam());
            });

            it('output verb', () => {
                inst.limit(12);

                areEqual({ text: 'LIMIT ?', values: [12] }, inst.toParam());
            });
        });

        it('can be removed using null', () => {
            inst.limit(1);
            inst.limit(null);

            areEqual({ text: '', values: [] }, inst.toParam());
        });
    });

    describe('AbstractConditionBlock', () => {
        class MockConditionBlock extends AbstractConditionBlock {
            constructor(options) {
                super(extend({}, options, { verb: 'MOCKVERB' }));
            }

            mockCondition(condition, ...values) {
                return this._condition(condition, ...Array.from(values));
            }
        }

        class MockSelectWithCondition extends Select {
            constructor(options, blocks = null) {
                blocks = [
                    new StringBlock(options, 'SELECT'),
                    new GetFieldBlock(options),
                    new FromTableBlock(options),
                    new MockConditionBlock(options),
                ];

                super(options, blocks);
            }
        }

        beforeEach(() => {
            testContext.cls = AbstractConditionBlock;
            inst = new testContext.cls({
                verb: 'ACB',
            });
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('_condition()', () => {
            it('adds to list', () => {
                inst._condition('a = 1');
                inst._condition('b = 2 OR c = 3');

                areEqual(
                    [
                        {
                            expr: 'a = 1',
                            values: [],
                        },
                        {
                            expr: 'b = 2 OR c = 3',
                            values: [],
                        },
                    ],
                    inst._conditions
                );
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeExpression', () => '_c');

                inst._condition('a = 1');

                expect(sanitizeFieldSpy.calledWithExactly('a = 1')).toBeTruthy();

                areEqual(
                    [
                        {
                            expr: '_c',
                            values: [],
                        },
                    ],
                    inst._conditions
                );
            });

            describe('_toParamString()', () => {
                it('output nothing if no conditions set', () => {
                    areEqual(inst._toParamString(), {
                        text: '',
                        values: [],
                    });
                });

                describe('output QueryBuilder ', () => {
                    beforeEach(() => {
                        const subquery = new MockSelectWithCondition();

                        subquery.field('col1').from('table1').mockCondition('field1 = ?', 10);
                        inst._condition('a in ?', subquery);
                        inst._condition('b = ? OR c = ?', 2, 3);
                        inst._condition('d in ?', [4, 5, 6]);
                    });
                    it('non-parameterized', () => {
                        areEqual(inst._toParamString(), {
                            text: 'ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))',
                            values: [],
                        });
                    });
                    it('parameterized', () => {
                        areEqual(
                            inst._toParamString({
                                buildParameterized: true,
                            }),
                            {
                                text: 'ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))',
                                values: [10, 2, 3, 4, 5, 6],
                            }
                        );
                    });
                });

                describe('Fix for #64 - toString() does not change object', () => {
                    beforeEach(() => {
                        inst._condition('a = ?', 1);
                        inst._condition('b = ? OR c = ?', 2, 3);
                        inst._condition('d in ?', [4, 5, 6]);
                        inst._toParamString();
                        inst._toParamString();
                    });
                    it('non-parameterized', () => {
                        areEqual(inst._toParamString(), {
                            text: 'ACB (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))',
                            values: [],
                        });
                    });
                    it('parameterized', () => {
                        areEqual(
                            inst._toParamString({
                                buildParameterized: true,
                            }),
                            {
                                text: 'ACB (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))',
                                values: [1, 2, 3, 4, 5, 6],
                            }
                        );
                    });
                });

                describe('Fix for #226 - empty expressions', () => {
                    beforeEach(() => {
                        inst._condition('a = ?', 1);
                        inst._condition(squel.expr());
                    });
                    it('non-parameterized', () => {
                        areEqual(inst._toParamString(), {
                            text: 'ACB (a = 1)',
                            values: [],
                        });
                    });
                    it('parameterized', () => {
                        areEqual(
                            inst._toParamString({
                                buildParameterized: true,
                            }),
                            {
                                text: 'ACB (a = ?)',
                                values: [1],
                            }
                        );
                    });
                });
            });
        });
    });

    describe('WhereBlock', () => {
        beforeEach(() => {
            testContext.cls = WhereBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractConditionBlock', () => {
            expect(inst).toBeInstanceOf(AbstractConditionBlock);
        });

        it('sets verb to WHERE', () => {
            inst = new testContext.cls();

            areEqual('WHERE', inst.options.verb);
        });

        describe('_toParamString()', () => {
            it('output nothing if no conditions set', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });

            describe('output', () => {
                beforeEach(() => {
                    const subquery = new Select();

                    subquery.field('col1').from('table1').where('field1 = ?', 10);
                    inst.where('a in ?', subquery);
                    inst.where('b = ? OR c = ?', 2, 3);
                    inst.where('d in ?', [4, 5, 6]);
                });
                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: 'WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: 'WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))',
                            values: [10, 2, 3, 4, 5, 6],
                        }
                    );
                });
            });
        });
    });

    describe('HavingBlock', () => {
        beforeEach(() => {
            testContext.cls = HavingBlock;
            inst = new testContext.cls();
        });

        it('instanceof of AbstractConditionBlock', () => {
            expect(inst).toBeInstanceOf(AbstractConditionBlock);
        });

        it('sets verb', () => {
            inst = new testContext.cls();

            areEqual('HAVING', inst.options.verb);
        });

        describe('_toParamString()', () => {
            it('output nothing if no conditions set', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });

            describe('output', () => {
                beforeEach(() => {
                    const subquery = new Select();

                    subquery.field('col1').from('table1').where('field1 = ?', 10);
                    inst.having('a in ?', subquery);
                    inst.having('b = ? OR c = ?', 2, 3);
                    inst.having('d in ?', [4, 5, 6]);
                });
                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: 'HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: 'HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))',
                            values: [10, 2, 3, 4, 5, 6],
                        }
                    );
                });
            });
        });
    });

    describe('OrderByBlock', () => {
        beforeEach(() => {
            testContext.cls = OrderByBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('order()', () => {
            it('adds to list', () => {
                inst.order('field1');
                inst.order('field2', false);
                inst.order('field3', true);

                const expected = [
                    {
                        field: 'field1',
                        dir: 'ASC',
                        values: [],
                    },
                    {
                        field: 'field2',
                        dir: 'DESC',
                        values: [],
                    },
                    {
                        field: 'field3',
                        dir: 'ASC',
                        values: [],
                    },
                ];

                areEqual(inst._orders, expected);
            });

            it('sanitizes inputs', () => {
                const sanitizeFieldSpy = mocker.stub(testContext.cls.prototype, '_sanitizeField', () => '_f');

                inst.order('field1');

                expect(sanitizeFieldSpy.calledWithExactly('field1')).toBeTruthy();

                areEqual(inst._orders, [{ field: '_f', dir: 'ASC', values: [] }]);
            });

            it('saves additional values', () => {
                inst.order('field1', false, 1.2, 4);

                areEqual(inst._orders, [
                    {
                        field: 'field1',
                        dir: 'DESC',
                        values: [1.2, 4],
                    },
                ]);
            });
        });

        describe('_toParamString()', () => {
            it('empty', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });

            describe('default', () => {
                beforeEach(() => {
                    inst.order('field1');
                    inst.order('field2', false);
                    inst.order('GET(?, ?)', true, 2.5, 5);
                });
                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: 'ORDER BY field1 ASC, field2 DESC, GET(2.5, 5) ASC',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: 'ORDER BY field1 ASC, field2 DESC, GET(?, ?) ASC',
                            values: [2.5, 5],
                        }
                    );
                });
            });
        });
    });

    describe('JoinBlock', () => {
        beforeEach(() => {
            testContext.cls = JoinBlock;
            inst = new testContext.cls();
        });

        it('instanceof of Block', () => {
            expect(inst).toBeInstanceOf(Block);
        });

        describe('join()', () => {
            it('adds to list', () => {
                inst.join('table1');
                inst.join('table2', null, 'b = 1', 'LEFT');
                inst.join('table3', 'alias3', 'c = 1', 'RIGHT');
                inst.join('table4', 'alias4', 'd = 1', 'OUTER');
                inst.join('table5', 'alias5', null, 'CROSS');

                const expected = [
                    {
                        type: 'INNER',
                        table: 'table1',
                        alias: null,
                        condition: null,
                    },
                    {
                        type: 'LEFT',
                        table: 'table2',
                        alias: null,
                        condition: 'b = 1',
                    },
                    {
                        type: 'RIGHT',
                        table: 'table3',
                        alias: 'alias3',
                        condition: 'c = 1',
                    },
                    {
                        type: 'OUTER',
                        table: 'table4',
                        alias: 'alias4',
                        condition: 'd = 1',
                    },
                    {
                        type: 'CROSS',
                        table: 'table5',
                        alias: 'alias5',
                        condition: null,
                    },
                ];

                areEqual(inst._joins, expected);
            });

            it('sanitizes inputs', () => {
                const sanitizeTableSpy = mocker.stub(testContext.cls.prototype, '_sanitizeTable', () => '_t');
                const sanitizeAliasSpy = mocker.stub(testContext.cls.prototype, '_sanitizeTableAlias', () => '_a');
                const sanitizeConditionSpy = mocker.stub(testContext.cls.prototype, '_sanitizeExpression', () => '_c');

                inst.join('table1', 'alias1', 'a = 1');

                expect(sanitizeTableSpy.calledWithExactly('table1')).toBeTruthy();
                expect(sanitizeAliasSpy.calledWithExactly('alias1')).toBeTruthy();
                expect(sanitizeConditionSpy.calledWithExactly('a = 1')).toBeTruthy();

                const expected = [
                    {
                        type: 'INNER',
                        table: '_t',
                        alias: '_a',
                        condition: '_c',
                    },
                ];

                areEqual(inst._joins, expected);
            });

            it('nested queries', () => {
                const inner1 = squel.select();
                const inner2 = squel.select();
                const inner3 = squel.select();
                const inner4 = squel.select();
                const inner5 = squel.select();
                const inner6 = squel.select();

                inst.join(inner1);
                inst.join(inner2, null, 'b = 1', 'LEFT');
                inst.join(inner3, 'alias3', 'c = 1', 'RIGHT');
                inst.join(inner4, 'alias4', 'd = 1', 'OUTER');
                inst.join(inner5, 'alias5', 'e = 1', 'FULL');
                inst.join(inner6, 'alias6', null, 'CROSS');

                const expected = [
                    {
                        type: 'INNER',
                        table: inner1,
                        alias: null,
                        condition: null,
                    },
                    {
                        type: 'LEFT',
                        table: inner2,
                        alias: null,
                        condition: 'b = 1',
                    },
                    {
                        type: 'RIGHT',
                        table: inner3,
                        alias: 'alias3',
                        condition: 'c = 1',
                    },
                    {
                        type: 'OUTER',
                        table: inner4,
                        alias: 'alias4',
                        condition: 'd = 1',
                    },
                    {
                        type: 'FULL',
                        table: inner5,
                        alias: 'alias5',
                        condition: 'e = 1',
                    },
                    {
                        type: 'CROSS',
                        table: inner6,
                        alias: 'alias6',
                        condition: null,
                    },
                ];

                areEqual(inst._joins, expected);
            });
        });

        describe('right_join()', () => {
            it('calls join()', () => {
                const joinSpy = mocker.stub(inst, 'join');

                inst.right_join('t', 'a', 'c');

                expect(joinSpy.calledOnce).toBeTruthy();
                expect(joinSpy.calledWithExactly('t', 'a', 'c', 'RIGHT')).toBeTruthy();
            });
        });

        describe('outer_join()', () => {
            it('calls join()', () => {
                const joinSpy = mocker.stub(inst, 'join');

                inst.outer_join('t', 'a', 'c');

                expect(joinSpy.calledOnce).toBeTruthy();
                expect(joinSpy.calledWithExactly('t', 'a', 'c', 'OUTER')).toBeTruthy();
            });
        });

        describe('left_outer_join()', () => {
            it('calls join()', () => {
                const joinSpy = mocker.stub(inst, 'join');

                inst.left_outer_join('t', 'a', 'c');

                expect(joinSpy.calledOnce).toBeTruthy();
                expect(joinSpy.calledWithExactly('t', 'a', 'c', 'LEFT OUTER')).toBeTruthy();
            });
        });

        describe('full_join()', () => {
            it('calls join()', () => {
                const joinSpy = mocker.stub(inst, 'join');

                inst.full_join('t', 'a', 'c');

                expect(joinSpy.calledOnce).toBeTruthy();
                expect(joinSpy.calledWithExactly('t', 'a', 'c', 'FULL')).toBeTruthy();
            });
        });

        describe('cross_join()', () => {
            it('calls join()', () => {
                const joinSpy = mocker.stub(inst, 'join');

                inst.cross_join('t', 'a', 'c');

                expect(joinSpy.calledOnce).toBeTruthy();
                expect(joinSpy.calledWithExactly('t', 'a', 'c', 'CROSS')).toBeTruthy();
            });
        });

        describe('left_join()', () => {
            it('calls join()', () => {
                const joinSpy = mocker.stub(inst, 'join');

                inst.left_join('t', 'a', 'c');

                expect(joinSpy.calledOnce).toBeTruthy();
                expect(joinSpy.calledWithExactly('t', 'a', 'c', 'LEFT')).toBeTruthy();
            });
        });

        describe('_toParamString()', () => {
            it('output nothing if nothing set', () => {
                areEqual(inst._toParamString(), {
                    text: '',
                    values: [],
                });
            });

            describe('output JOINs with nested queries', () => {
                beforeEach(() => {
                    const inner2 = squel.select().function('GETDATE(?)', 2);
                    const inner3 = squel.select().from('3');
                    const inner4 = squel.select().from('4');
                    const inner5 = squel.select().from('5');
                    const expr = squel.expr().and('field1 = ?', 99);

                    inst.join('table');
                    inst.join(inner2, null, 'b = 1', 'LEFT');
                    inst.join(inner3, 'alias3', 'c = 1', 'RIGHT');
                    inst.join(inner4, 'alias4', 'e = 1', 'FULL');
                    inst.join(inner5, 'alias5', expr, 'CROSS');
                });

                it('non-parameterized', () => {
                    areEqual(inst._toParamString(), {
                        text: 'INNER JOIN table LEFT JOIN (SELECT GETDATE(2)) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5` ON (field1 = 99)',
                        values: [],
                    });
                });
                it('parameterized', () => {
                    areEqual(
                        inst._toParamString({
                            buildParameterized: true,
                        }),
                        {
                            text: 'INNER JOIN table LEFT JOIN (SELECT GETDATE(?)) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5` ON (field1 = ?)',
                            values: [2, 99],
                        }
                    );
                });
            });
        });
    });
});
