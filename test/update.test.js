import sinon from 'sinon';
import { extend, pick, keys } from 'lodash';
import squel from '../src';
import { StringBlock } from '../src/block';
import { DefaultQueryBuilderOptions } from '../src/base-builder';
import { QueryBuilder } from '../src/query-builder';

let mocker;
let inst = squel.update();

const areEqual = function (actual, expected, message) {
    expect(actual).toEqual(expected);
};

describe('UPDATE builder', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
        mocker = sinon.sandbox.create();
        inst = squel.update();
    });

    afterEach(() => {
        mocker.restore();
    });

    it('instanceof QueryBuilder', () => {
        expect(inst).toBeInstanceOf(QueryBuilder);
    });

    describe('constructor', () => {
        it('override options', () => {
            inst = squel.update({
                usingValuePlaceholders: true,
                dummy: true,
            });

            const expectedOptions = extend({}, DefaultQueryBuilderOptions, {
                usingValuePlaceholders: true,
                dummy: true,
            });

            Array.from(inst.blocks).map((block) =>
                areEqual(pick(block.options, keys(expectedOptions)), expectedOptions)
            );
        });

        it('override blocks', () => {
            const block = new StringBlock('SELECT');

            inst = squel.update({}, [block]);
            areEqual([block], inst.blocks);
        });
    });

    describe('build query', () => {
        it('need to call table() first', () => {
            expect(() => inst.toString()).toThrow();
        });

        it('need to call set() first', () => {
            inst.table('table');
            expect(() => inst.toString()).toThrow();
        });

        describe('>> table(table, t1).set(field, 1)', () => {
            beforeEach(() => {
                inst.table('table', 't1').set('field', 1);
            });
            it('toString', () => {
                areEqual(inst.toString(), 'UPDATE table `t1` SET field = 1');
            });

            describe('>> set(field2, 1.2)', () => {
                beforeEach(() => {
                    inst.set('field2', 1.2);
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = 1.2');
                });
            });

            describe('>> set(field2, true)', () => {
                beforeEach(() => {
                    inst.set('field2', true);
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = TRUE');
                });
            });

            describe('>> set(field2, "str")', () => {
                beforeEach(() => {
                    inst.set('field2', 'str');
                });
                it('toString', () => {
                    areEqual(inst.toString(), "UPDATE table `t1` SET field = 1, field2 = 'str'");
                });
                it('toParam', () => {
                    areEqual(inst.toParam(), {
                        text: 'UPDATE table `t1` SET field = ?, field2 = ?',
                        values: [1, 'str'],
                    });
                });
            });

            describe('>> set(field2, "str", { dontQuote: true })', () => {
                beforeEach(() => {
                    inst.set('field2', 'str', { dontQuote: true });
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = str');
                });
                it('toParam', () => {
                    areEqual(inst.toParam(), {
                        text: 'UPDATE table `t1` SET field = ?, field2 = ?',
                        values: [1, 'str'],
                    });
                });
            });

            describe('>> set(field, query builder)', () => {
                beforeEach(() => {
                    testContext.subQuery = squel.select().field('MAX(score)').from('scores');
                    inst.set('field', testContext.subQuery);
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'UPDATE table `t1` SET field = (SELECT MAX(score) FROM scores)');
                });
                it('toParam', () => {
                    const parameterized = inst.toParam();

                    areEqual(parameterized.text, 'UPDATE table `t1` SET field = (SELECT MAX(score) FROM scores)');
                    areEqual(parameterized.values, []);
                });
            });

            describe('>> set(custom value type)', () => {
                beforeEach(() => {
                    class MyClass {}
                    inst.registerValueHandler(MyClass, (a) => 'abcd');
                    inst.set('field', new MyClass());
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'UPDATE table `t1` SET field = (abcd)');
                });
                it('toParam', () => {
                    const parameterized = inst.toParam();

                    areEqual(parameterized.text, 'UPDATE table `t1` SET field = ?');
                    areEqual(parameterized.values, ['abcd']);
                });
            });

            describe(">> setFields({field2: 'value2', field3: true })", () => {
                beforeEach(() => {
                    inst.setFields({ field2: 'value2', field3: true });
                });
                it('toString', () => {
                    areEqual(inst.toString(), "UPDATE table `t1` SET field = 1, field2 = 'value2', field3 = TRUE");
                });
                it('toParam', () => {
                    const parameterized = inst.toParam();

                    areEqual(parameterized.text, 'UPDATE table `t1` SET field = ?, field2 = ?, field3 = ?');
                    areEqual(parameterized.values, [1, 'value2', true]);
                });
            });

            describe(">> setFields({field2: 'value2', field: true })", () => {
                beforeEach(() => {
                    inst.setFields({ field2: 'value2', field: true });
                });
                it('toString', () => {
                    areEqual(inst.toString(), "UPDATE table `t1` SET field = TRUE, field2 = 'value2'");
                });
            });

            describe('>> set(field2, null)', () => {
                beforeEach(() => {
                    inst.set('field2', null);
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = NULL');
                });
                it('toParam', () => {
                    areEqual(inst.toParam(), {
                        text: 'UPDATE table `t1` SET field = ?, field2 = ?',
                        values: [1, null],
                    });
                });

                describe('>> table(table2)', () => {
                    beforeEach(() => {
                        inst.table('table2');
                    });
                    it('toString', () => {
                        areEqual(inst.toString(), 'UPDATE table `t1`, table2 SET field = 1, field2 = NULL');
                    });

                    describe('>> where(a = 1)', () => {
                        beforeEach(() => {
                            inst.where('a = 1');
                        });
                        it('toString', () => {
                            areEqual(
                                inst.toString(),
                                'UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1)'
                            );
                        });

                        describe('>> order(a, true)', () => {
                            beforeEach(() => {
                                inst.order('a', true);
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC'
                                );
                            });

                            describe('>> limit(2)', () => {
                                beforeEach(() => {
                                    inst.limit(2);
                                });
                                it('toString', () => {
                                    areEqual(
                                        inst.toString(),
                                        'UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC LIMIT 2'
                                    );
                                });
                            });
                        });
                    });
                });
            });
        });

        describe(">> table(table, t1).setFields({field1: 1, field2: 'value2'})", () => {
            beforeEach(() => {
                inst.table('table', 't1').setFields({ field1: 1, field2: 'value2' });
            });
            it('toString', () => {
                areEqual(inst.toString(), "UPDATE table `t1` SET field1 = 1, field2 = 'value2'");
            });

            describe('>> set(field1, 1.2)', () => {
                beforeEach(() => {
                    inst.set('field1', 1.2);
                });
                it('toString', () => {
                    areEqual(inst.toString(), "UPDATE table `t1` SET field1 = 1.2, field2 = 'value2'");
                });
            });

            describe(">> setFields({field3: true, field4: 'value4'})", () => {
                beforeEach(() => {
                    inst.setFields({ field3: true, field4: 'value4' });
                });
                it('toString', () => {
                    areEqual(
                        inst.toString(),
                        "UPDATE table `t1` SET field1 = 1, field2 = 'value2', field3 = TRUE, field4 = 'value4'"
                    );
                });
            });

            describe(">> setFields({field1: true, field3: 'value3'})", () => {
                beforeEach(() => {
                    inst.setFields({ field1: true, field3: 'value3' });
                });
                it('toString', () => {
                    areEqual(
                        inst.toString(),
                        "UPDATE table `t1` SET field1 = TRUE, field2 = 'value2', field3 = 'value3'"
                    );
                });
            });
        });

        describe('>> table(table, t1).set("count = count + 1")', () => {
            beforeEach(() => {
                inst.table('table', 't1').set('count = count + 1');
            });
            it('toString', () => {
                areEqual(inst.toString(), 'UPDATE table `t1` SET count = count + 1');
            });
        });
    });

    describe('str()', () => {
        beforeEach(() => {
            inst.table('students').set('field', squel.str('GETDATE(?, ?)', 2014, '"feb"'));
        });
        it('toString', () => {
            areEqual('UPDATE students SET field = (GETDATE(2014, \'"feb"\'))', inst.toString());
        });
        it('toParam', () => {
            areEqual({ text: 'UPDATE students SET field = (GETDATE(?, ?))', values: [2014, '"feb"'] }, inst.toParam());
        });
    });

    describe('string formatting', () => {
        beforeEach(() => {
            inst.updateOptions({
                stringFormatter(str) {
                    return `N'${str}'`;
                },
            });
            inst.table('students').set('field', 'jack');
        });
        it('toString', () => {
            areEqual("UPDATE students SET field = N'jack'", inst.toString());
        });
        it('toParam', () => {
            areEqual({ text: 'UPDATE students SET field = ?', values: ['jack'] }, inst.toParam());
        });
    });

    it('fix for hiddentao/squel#63', () => {
        const newinst = inst.table('students').set('field = field + 1');

        newinst.set('field2', 2).set('field3', true);
        areEqual(
            { text: 'UPDATE students SET field = field + 1, field2 = ?, field3 = ?', values: [2, true] },
            inst.toParam()
        );
    });

    describe('dontQuote and replaceSingleQuotes set(field2, "ISNULL(\'str\', str)", { dontQuote: true })', () => {
        beforeEach(() => {
            inst = squel.update({ replaceSingleQuotes: true });
            inst.table('table', 't1').set('field', 1);
            inst.set('field2', "ISNULL('str', str)", { dontQuote: true });
        });
        it('toString', () => {
            areEqual(inst.toString(), "UPDATE table `t1` SET field = 1, field2 = ISNULL('str', str)");
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: 'UPDATE table `t1` SET field = ?, field2 = ?',
                values: [1, "ISNULL('str', str)"],
            });
        });
    });

    describe('fix for #223 - careful about array looping methods', () => {
        beforeEach(() => {
            Array.prototype.substr = () => 1;
        });
        afterEach(() => {
            delete Array.prototype.substr;
        });
        it('check()', () => {
            inst = squel
                .update()
                .table('users')
                .where('id = ?', 123)
                .set('active', 1)
                .set('regular', 0)
                .set('moderator', 1);

            areEqual(inst.toParam(), {
                text: 'UPDATE users SET active = ?, regular = ?, moderator = ? WHERE (id = ?)',
                values: [1, 0, 1, 123],
            });
        });
    });

    it('fix for #225 - autoquoting field names', () => {
        inst = squel
            .update({ autoQuoteFieldNames: true })
            .table('users')
            .where('id = ?', 123)
            .set('active', 1)
            .set('regular', 0)
            .set('moderator', 1);

        areEqual(inst.toParam(), {
            text: 'UPDATE users SET `active` = ?, `regular` = ?, `moderator` = ? WHERE (id = ?)',
            values: [1, 0, 1, 123],
        });
    });

    describe('fix for #243 - ampersand in conditions', () => {
        beforeEach(() => {
            inst = squel.update().table('a').set('a = a & ?', 2);
        });
        it('toString', () => {
            areEqual(inst.toString(), 'UPDATE a SET a = a & 2');
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: 'UPDATE a SET a = a & ?',
                values: [2],
            });
        });
    });

    it('cloning', () => {
        const newinst = inst.table('students').set('field', 1).clone();

        newinst.set('field', 2).set('field2', true);

        areEqual('UPDATE students SET field = 1', inst.toString());
        areEqual('UPDATE students SET field = 2, field2 = TRUE', newinst.toString());
    });
});
