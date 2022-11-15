import sinon from 'sinon';
import { extend, pick, keys } from 'lodash';
import squel from '../src';
import { StringBlock } from '../src/block';
import { DefaultQueryBuilderOptions } from '../src/base-builder';
import { QueryBuilder } from '../src/query-builder';

let mocker;
let inst = squel.select();

const areEqual = function (actual, expected, message) {
    expect(actual).toEqual(expected);
};

describe('SELECT builder', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
        mocker = sinon.sandbox.create();
        inst = squel.select();
    });

    afterEach(() => {
        mocker.restore();
    });

    it('instanceof QueryBuilder', () => {
        expect(inst).toBeInstanceOf(QueryBuilder);
    });

    describe('constructor', () => {
        it('override options', () => {
            inst = squel.select({
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

            inst = squel.select({}, [block]);
            areEqual([block], inst.blocks);
        });
    });

    describe('build query', () => {
        it('no need to call from() first', () => {
            inst.toString();
        });

        describe('>> function(1)', () => {
            beforeEach(() => {
                inst.function('1');
            });
            it('toString', () => {
                areEqual(inst.toString(), 'SELECT 1');
            });
            it('toParam', () => {
                areEqual(inst.toParam(), { text: 'SELECT 1', values: [] });
            });
        });

        describe('>> function(MAX(?,?), 3, 5)', () => {
            beforeEach(() => {
                inst.function('MAX(?, ?)', 3, 5);
            });
            it('toString', () => {
                areEqual(inst.toString(), 'SELECT MAX(3, 5)');
            });
            it('toParam', () => {
                areEqual(inst.toParam(), { text: 'SELECT MAX(?, ?)', values: [3, 5] });
            });
        });

        describe('>> from(table).from(table2, alias2)', () => {
            beforeEach(() => {
                inst.from('table').from('table2', 'alias2');
            });
            it('toString', () => {
                areEqual(inst.toString(), 'SELECT * FROM table, table2 `alias2`');
            });

            describe('>> field(squel.select().field("MAX(score)").FROM("scores"), fa1)', () => {
                beforeEach(() => {
                    inst.field(squel.select().field('MAX(score)').from('scores'), 'fa1');
                });
                it('toString', () => {
                    areEqual(
                        inst.toString(),
                        'SELECT (SELECT MAX(score) FROM scores) AS "fa1" FROM table, table2 `alias2`'
                    );
                });
            });

            describe('>> field(squel.case().when(score > ?, 1).then(1), fa1)', () => {
                beforeEach(() => {
                    inst.field(squel.case().when('score > ?', 1).then(1), 'fa1');
                });
                it('toString', () => {
                    areEqual(
                        inst.toString(),
                        'SELECT CASE WHEN (score > 1) THEN 1 ELSE NULL END AS "fa1" FROM table, table2 `alias2`'
                    );
                });
                it('toParam', () => {
                    areEqual(inst.toParam(), {
                        text: 'SELECT CASE WHEN (score > ?) THEN 1 ELSE NULL END AS "fa1" FROM table, table2 `alias2`',
                        values: [1],
                    });
                });
            });

            describe('>> field( squel.str(SUM(?), squel.case().when(score > ?, 1).then(1) ), fa1)', () => {
                beforeEach(() => {
                    inst.field(squel.str('SUM(?)', squel.case().when('score > ?', 1).then(1)), 'fa1');
                });
                it('toString', () => {
                    areEqual(
                        inst.toString(),
                        'SELECT (SUM((CASE WHEN (score > 1) THEN 1 ELSE NULL END))) AS "fa1" FROM table, table2 `alias2`'
                    );
                });
                it('toParam', () => {
                    areEqual(inst.toParam(), {
                        text: 'SELECT (SUM(CASE WHEN (score > ?) THEN 1 ELSE NULL END)) AS "fa1" FROM table, table2 `alias2`',
                        values: [1],
                    });
                });
            });

            describe('>> field(field1, fa1) >> field(field2)', () => {
                beforeEach(() => {
                    inst.field('field1', 'fa1').field('field2');
                });
                it('toString', () => {
                    areEqual(inst.toString(), 'SELECT field1 AS "fa1", field2 FROM table, table2 `alias2`');
                });

                describe('>> distinct()', () => {
                    beforeEach(() => {
                        inst.distinct();
                    });
                    it('toString', () => {
                        areEqual(
                            inst.toString(),
                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2`'
                        );
                    });

                    describe('>> group(field) >> group(field2)', () => {
                        beforeEach(() => {
                            inst.group('field').group('field2');
                        });
                        it('toString', () => {
                            areEqual(
                                inst.toString(),
                                'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2'
                            );
                        });

                        describe('>> where(a = ?, squel.select().field("MAX(score)").from("scores"))', () => {
                            beforeEach(() => {
                                testContext.subQuery = squel.select().field('MAX(score)').from('scores');
                                inst.where('a = ?', testContext.subQuery);
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT MAX(score) FROM scores)) GROUP BY field, field2'
                                );
                            });
                            it('toParam', () => {
                                areEqual(inst.toParam(), {
                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT MAX(score) FROM scores)) GROUP BY field, field2',
                                    values: [],
                                });
                            });
                        });

                        describe('>> where(squel.expr().and(a = ?, 1).and( expr().or(b = ?, 2).or(c = ?, 3) ))', () => {
                            beforeEach(() => {
                                inst.where(
                                    squel.expr().and('a = ?', 1).and(squel.expr().or('b = ?', 2).or('c = ?', 3))
                                );
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1 AND (b = 2 OR c = 3)) GROUP BY field, field2'
                                );
                            });
                            it('toParam', () => {
                                areEqual(inst.toParam(), {
                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ? AND (b = ? OR c = ?)) GROUP BY field, field2',
                                    values: [1, 2, 3],
                                });
                            });
                        });

                        describe('>> where(squel.expr().and(a = ?, QueryBuilder).and( expr().or(b = ?, 2).or(c = ?, 3) ))', () => {
                            beforeEach(() => {
                                const subQuery = squel.select().field('field1').from('table1').where('field2 = ?', 10);

                                inst.where(
                                    squel.expr().and('a = ?', subQuery).and(squel.expr().or('b = ?', 2).or('c = ?', 3))
                                );
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT field1 FROM table1 WHERE (field2 = 10)) AND (b = 2 OR c = 3)) GROUP BY field, field2'
                                );
                            });
                            it('toParam', () => {
                                areEqual(inst.toParam(), {
                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT field1 FROM table1 WHERE (field2 = ?)) AND (b = ? OR c = ?)) GROUP BY field, field2',
                                    values: [10, 2, 3],
                                });
                            });
                        });

                        describe('>> having(squel.expr().and(a = ?, QueryBuilder).and( expr().or(b = ?, 2).or(c = ?, 3) ))', () => {
                            beforeEach(() => {
                                const subQuery = squel.select().field('field1').from('table1').having('field2 = ?', 10);

                                inst.having(
                                    squel.expr().and('a = ?', subQuery).and(squel.expr().or('b = ?', 2).or('c = ?', 3))
                                );
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2 HAVING (a = (SELECT field1 FROM table1 HAVING (field2 = 10)) AND (b = 2 OR c = 3))'
                                );
                            });
                            it('toParam', () => {
                                areEqual(inst.toParam(), {
                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2 HAVING (a = (SELECT field1 FROM table1 HAVING (field2 = ?)) AND (b = ? OR c = ?))',
                                    values: [10, 2, 3],
                                });
                            });
                        });

                        describe('>> where(a = ?, null)', () => {
                            beforeEach(() => {
                                inst.where('a = ?', null);
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = NULL) GROUP BY field, field2'
                                );
                            });
                            it('toParam', () => {
                                areEqual(inst.toParam(), {
                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ?) GROUP BY field, field2',
                                    values: [null],
                                });
                            });
                        });

                        describe('>> where(a = ?, 1)', () => {
                            beforeEach(() => {
                                inst.where('a = ?', 1);
                            });
                            it('toString', () => {
                                areEqual(
                                    inst.toString(),
                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1) GROUP BY field, field2'
                                );
                            });
                            it('toParam', () => {
                                areEqual(inst.toParam(), {
                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ?) GROUP BY field, field2',
                                    values: [1],
                                });
                            });

                            describe('>> join(other_table)', () => {
                                beforeEach(() => {
                                    inst.join('other_table');
                                });
                                it('toString', () => {
                                    areEqual(
                                        inst.toString(),
                                        'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2'
                                    );
                                });

                                describe('>> order(a)', () => {
                                    beforeEach(() => {
                                        inst.order('a');
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'
                                        );
                                    });
                                });

                                describe('>> order(a, null)', () => {
                                    beforeEach(() => {
                                        inst.order('a', null);
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a'
                                        );
                                    });
                                });

                                describe(">> order(a, 'asc nulls last')", () => {
                                    beforeEach(() => {
                                        inst.order('a', 'asc nulls last');
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a asc nulls last'
                                        );
                                    });
                                });

                                describe('>> order(a, true)', () => {
                                    beforeEach(() => {
                                        inst.order('a', true);
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'
                                        );
                                    });

                                    describe('>> limit(2)', () => {
                                        beforeEach(() => {
                                            inst.limit(2);
                                        });
                                        it('toString', () => {
                                            areEqual(
                                                inst.toString(),
                                                'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2'
                                            );
                                        });
                                        it('toParam', () => {
                                            areEqual(inst.toParam(), {
                                                text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ?',
                                                values: [1, 2],
                                            });
                                        });

                                        describe('>> limit(0)', () => {
                                            beforeEach(() => {
                                                inst.limit(0);
                                            });
                                            it('toString', () => {
                                                areEqual(
                                                    inst.toString(),
                                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 0'
                                                );
                                            });
                                            it('toParam', () => {
                                                areEqual(inst.toParam(), {
                                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ?',
                                                    values: [1, 0],
                                                });
                                            });
                                        });

                                        describe('>> offset(3)', () => {
                                            beforeEach(() => {
                                                inst.offset(3);
                                            });
                                            it('toString', () => {
                                                areEqual(
                                                    inst.toString(),
                                                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2 OFFSET 3'
                                                );
                                            });
                                            it('toParam', () => {
                                                areEqual(inst.toParam(), {
                                                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ? OFFSET ?',
                                                    values: [1, 2, 3],
                                                });
                                            });

                                            describe('>> offset(0)', () => {
                                                beforeEach(() => {
                                                    inst.offset(0);
                                                });
                                                it('toString', () => {
                                                    areEqual(
                                                        inst.toString(),
                                                        'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2 OFFSET 0'
                                                    );
                                                });
                                                it('toParam', () => {
                                                    areEqual(inst.toParam(), {
                                                        text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ? OFFSET ?',
                                                        values: [1, 2, 0],
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });

                                describe('>> order(DIST(?,?), true, 2, 3)', () => {
                                    beforeEach(() => {
                                        inst.order('DIST(?, ?)', true, 2, false);
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY DIST(2, FALSE) ASC'
                                        );
                                    });
                                    it('toParam', () => {
                                        areEqual(inst.toParam(), {
                                            text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY DIST(?, ?) ASC',
                                            values: [1, 2, false],
                                        });
                                    });
                                });

                                describe('>> order(a)', () => {
                                    beforeEach(() => {
                                        inst.order('a');
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'
                                        );
                                    });
                                });

                                describe('>> order(b, null)', () => {
                                    beforeEach(() => {
                                        inst.order('b', null);
                                    });
                                    it('toString', () => {
                                        areEqual(
                                            inst.toString(),
                                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY b'
                                        );
                                    });
                                });
                            });

                            describe('>> join(other_table, condition = expr())', () => {
                                beforeEach(() => {
                                    const subQuery = squel
                                        .select()
                                        .field('abc')
                                        .from('table1')
                                        .where('adf = ?', 'today1');
                                    const subQuery2 = squel
                                        .select()
                                        .field('xyz')
                                        .from('table2')
                                        .where('adf = ?', 'today2');
                                    const expr = squel.expr().and('field1 = ?', subQuery);

                                    inst.join('other_table', null, expr);
                                    inst.where('def IN ?', subQuery2);
                                });
                                it('toString', () => {
                                    areEqual(
                                        inst.toString(),
                                        "SELECT DISTINCT field1 AS \"fa1\", field2 FROM table, table2 `alias2` INNER JOIN other_table ON (field1 = (SELECT abc FROM table1 WHERE (adf = 'today1'))) WHERE (a = 1) AND (def IN (SELECT xyz FROM table2 WHERE (adf = 'today2'))) GROUP BY field, field2"
                                    );
                                });
                                it('toParam', () => {
                                    areEqual(inst.toParam(), {
                                        text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table ON (field1 = (SELECT abc FROM table1 WHERE (adf = ?))) WHERE (a = ?) AND (def IN (SELECT xyz FROM table2 WHERE (adf = ?))) GROUP BY field, field2',
                                        values: ['today1', 1, 'today2'],
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        describe('nested queries', () => {
            it('basic', () => {
                const inner1 = squel.select().from('students');
                const inner2 = squel.select().from('scores');

                inst.from(inner1).from(inner2, 'scores');

                areEqual(inst.toString(), 'SELECT * FROM (SELECT * FROM students), (SELECT * FROM scores) `scores`');
            });
            it('deep nesting', () => {
                const inner1 = squel.select().from('students');
                const inner2 = squel.select().from(inner1);

                inst.from(inner2);

                areEqual(inst.toString(), 'SELECT * FROM (SELECT * FROM (SELECT * FROM students))');
            });

            it('nesting in JOINs', () => {
                const inner1 = squel.select().from('students');
                const inner2 = squel.select().from(inner1);

                inst.from('schools').join(inner2, 'meh', 'meh.ID = ID');

                areEqual(
                    inst.toString(),
                    'SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students)) `meh` ON (meh.ID = ID)'
                );
            });

            it('nesting in JOINs with params', () => {
                const inner1 = squel.select().from('students').where('age = ?', 6);
                const inner2 = squel.select().from(inner1);

                inst.from('schools').where('school_type = ?', 'junior').join(inner2, 'meh', 'meh.ID = ID');

                areEqual(
                    inst.toString(),
                    "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = 6))) `meh` ON (meh.ID = ID) WHERE (school_type = 'junior')"
                );
                areEqual(inst.toParam(), {
                    text: 'SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = ?))) `meh` ON (meh.ID = ID) WHERE (school_type = ?)',
                    values: [6, 'junior'],
                });
                areEqual(inst.toParam({ numberedParameters: true }), {
                    text: 'SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = $1))) `meh` ON (meh.ID = ID) WHERE (school_type = $2)',
                    values: [6, 'junior'],
                });
            });
        });
    });

    describe('Complex table name, e.g. LATERAL (#230)', () => {
        beforeEach(() => {
            inst = squel
                .select()
                .from('foo')
                .from(squel.str('LATERAL(?)', squel.select().from('bar').where('bar.id = ?', 2)), 'ss');
        });
        it('toString', () => {
            areEqual(inst.toString(), 'SELECT * FROM foo, (LATERAL((SELECT * FROM bar WHERE (bar.id = 2)))) `ss`');
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: 'SELECT * FROM foo, (LATERAL((SELECT * FROM bar WHERE (bar.id = ?)))) `ss`',
                values: [2],
            });
        });
    });

    describe('cloning', () => {
        it('basic', () => {
            const newinst = inst.from('students').limit(10).clone();

            newinst.limit(20);

            areEqual('SELECT * FROM students LIMIT 10', inst.toString());
            areEqual('SELECT * FROM students LIMIT 20', newinst.toString());
        });

        it('with expressions (ticket #120)', () => {
            const expr = squel.expr().and('a = 1');
            const newinst = inst.from('table').left_join('table_2', 't', expr).clone().where('c = 1');

            expr.and('b = 2');

            areEqual('SELECT * FROM table LEFT JOIN table_2 `t` ON (a = 1 AND b = 2)', inst.toString());
            areEqual('SELECT * FROM table LEFT JOIN table_2 `t` ON (a = 1) WHERE (c = 1)', newinst.toString());
        });

        it('with sub-queries (ticket #120)', () => {
            const newinst = inst.from(squel.select().from('students')).limit(30).clone().where('c = 1').limit(35);

            areEqual('SELECT * FROM (SELECT * FROM students) LIMIT 30', inst.toString());
            areEqual('SELECT * FROM (SELECT * FROM students) WHERE (c = 1) LIMIT 35', newinst.toString());
        });

        it('with complex expressions', () => {
            const expr = squel
                .expr()
                .and(squel.expr().or('b = 2').or(squel.expr().and('c = 3').and('d = 4')))
                .and('a = 1');

            const newinst = inst.from('table').left_join('table_2', 't', expr).clone().where('c = 1');

            expr.and('e = 5');

            areEqual(
                inst.toString(),
                'SELECT * FROM table LEFT JOIN table_2 `t` ON ((b = 2 OR (c = 3 AND d = 4)) AND a = 1 AND e = 5)'
            );
            areEqual(
                newinst.toString(),
                'SELECT * FROM table LEFT JOIN table_2 `t` ON ((b = 2 OR (c = 3 AND d = 4)) AND a = 1) WHERE (c = 1)'
            );
        });
    });

    it('can specify block separator', () => {
        areEqual(
            squel.select({ separator: '\n' }).field('thing').from('table').toString(),
            `SELECT\nthing\nFROM table`
        );
    });

    describe('#242 - auto-quote table names', () => {
        beforeEach(() => {
            inst = squel.select({ autoQuoteTableNames: true }).field('name').where('age > ?', 15);
        });

        describe('using string', () => {
            beforeEach(() => {
                inst.from('students', 's');
            });

            it('toString', () => {
                areEqual(inst.toString(), `SELECT name FROM \`students\` \`s\` WHERE (age > 15)`);
            });

            it('toParam', () => {
                areEqual(inst.toParam(), {
                    text: 'SELECT name FROM `students` `s` WHERE (age > ?)',
                    values: [15],
                });
            });
        });

        describe('using query builder', () => {
            beforeEach(() => {
                inst.from(squel.select().from('students'), 's');
            });

            it('toString', () => {
                areEqual(inst.toString(), `SELECT name FROM (SELECT * FROM students) \`s\` WHERE (age > 15)`);
            });

            it('toParam', () => {
                areEqual(inst.toParam(), {
                    text: 'SELECT name FROM (SELECT * FROM students) `s` WHERE (age > ?)',
                    values: [15],
                });
            });
        });
    });

    describe('UNION JOINs', () => {
        describe('Two Queries NO Params', () => {
            beforeEach(() => {
                testContext.qry1 = squel.select().field('name').from('students').where('age > 15');
                testContext.qry2 = squel.select().field('name').from('students').where('age < 6');

                return testContext.qry1.union(testContext.qry2);
            });

            it('toString', () => {
                areEqual(
                    testContext.qry1.toString(),
                    `SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))`
                );
            });
            it('toParam', () => {
                areEqual(testContext.qry1.toParam(), {
                    text: 'SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))',
                    values: [],
                });
            });
        });

        describe('Two Strings No Params', () => {
            beforeEach(() => {
                testContext.qry1 = squel.select().field('name').from('students').where('age > 15');
                testContext.qry2 = squel.select().field('name').from('students').where('age < 6');

                return testContext.qry1.union(testContext.qry2.toString());
            });

            it('toString', () => {
                areEqual(
                    testContext.qry1.toString(),
                    `SELECT name FROM students WHERE (age > 15) UNION SELECT name FROM students WHERE (age < 6)`
                );
            });
            it('toParam', () => {
                areEqual(testContext.qry1.toParam(), {
                    text: 'SELECT name FROM students WHERE (age > 15) UNION SELECT name FROM students WHERE (age < 6)',
                    values: [],
                });
            });
        });

        describe('Two Queries with Params', () => {
            beforeEach(() => {
                testContext.qry1 = squel.select().field('name').from('students').where('age > ?', 15);
                testContext.qry2 = squel.select().field('name').from('students').where('age < ?', 6);

                return testContext.qry1.union(testContext.qry2);
            });

            it('toString', () => {
                areEqual(
                    testContext.qry1.toString(),
                    `SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))`
                );
            });
            it('toParam', () => {
                areEqual(testContext.qry1.toParam(), {
                    text: 'SELECT name FROM students WHERE (age > ?) UNION (SELECT name FROM students WHERE (age < ?))',
                    values: [15, 6],
                });
            });
        });

        describe('Three Queries', () => {
            beforeEach(() => {
                testContext.qry1 = squel.select().field('name').from('students').where('age > ?', 15);
                testContext.qry2 = squel.select().field('name').from('students').where('age < 6');
                testContext.qry3 = squel.select().field('name').from('students').where('age = ?', 8);
                testContext.qry1.union(testContext.qry2);

                return testContext.qry1.union(testContext.qry3);
            });

            it('toParam', () => {
                areEqual(testContext.qry1.toParam(), {
                    text: 'SELECT name FROM students WHERE (age > ?) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = ?))',
                    values: [15, 8],
                });
            });
            it('toParam(2)', () => {
                areEqual(testContext.qry1.toParam({ numberedParameters: true, numberedParametersStartAt: 2 }), {
                    text: 'SELECT name FROM students WHERE (age > $2) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = $3))',
                    values: [15, 8],
                });
            });
        });

        describe('Multi-Parameter Query', () => {
            beforeEach(() => {
                testContext.qry1 = squel.select().field('name').from('students').where('age > ?', 15);
                testContext.qry2 = squel.select().field('name').from('students').where('age < ?', 6);
                testContext.qry3 = squel.select().field('name').from('students').where('age = ?', 8);
                testContext.qry4 = squel.select().field('name').from('students').where('age IN [?, ?]', 2, 10);
                testContext.qry1.union(testContext.qry2);
                testContext.qry1.union(testContext.qry3);

                return testContext.qry4.union_all(testContext.qry1);
            });

            it('toString', () => {
                areEqual(
                    testContext.qry4.toString(),
                    `SELECT name FROM students WHERE (age IN [2, 10]) UNION ALL (SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = 8)))`
                );
            });
            it('toParam', () => {
                areEqual(testContext.qry4.toParam({ numberedParameters: true }), {
                    text: 'SELECT name FROM students WHERE (age IN [$1, $2]) UNION ALL (SELECT name FROM students WHERE (age > $3) UNION (SELECT name FROM students WHERE (age < $4)) UNION (SELECT name FROM students WHERE (age = $5)))',
                    values: [2, 10, 15, 6, 8],
                });
            });
        });
    });

    describe('Where builder expression', () => {
        beforeEach(() => {
            inst = squel
                .select()
                .from('table')
                .where('a = ?', 5)
                .where(squel.str('EXISTS(?)', squel.select().from('blah').where('b > ?', 6)));
        });
        it('toString', () => {
            areEqual(
                inst.toString(),
                `SELECT * FROM table WHERE (a = 5) AND (EXISTS((SELECT * FROM blah WHERE (b > 6))))`
            );
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: 'SELECT * FROM table WHERE (a = ?) AND (EXISTS((SELECT * FROM blah WHERE (b > ?))))',
                values: [5, 6],
            });
        });
    });

    describe('Join on builder expression', () => {
        beforeEach(() => {
            inst = squel
                .select()
                .from('table')
                .join('table2', 't2', squel.str('EXISTS(?)', squel.select().from('blah').where('b > ?', 6)));
        });
        it('toString', () => {
            areEqual(
                inst.toString(),
                `SELECT * FROM table INNER JOIN table2 \`t2\` ON (EXISTS((SELECT * FROM blah WHERE (b > 6))))`
            );
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: 'SELECT * FROM table INNER JOIN table2 `t2` ON (EXISTS((SELECT * FROM blah WHERE (b > ?))))',
                values: [6],
            });
        });
    });

    describe('#301 - FROM rstr() with nesting', () => {
        beforeEach(() => {
            inst = squel.select().from(squel.rstr('generate_series(?,?,?)', 1, 10, 2), 'tblfn(odds)');
        });
        it('toString', () => {
            areEqual(inst.toString(), `SELECT * FROM generate_series(1,10,2) \`tblfn(odds)\``);
        });
        it('toParam', () => {
            areEqual(inst.toParam(), {
                text: 'SELECT * FROM generate_series(?,?,?) `tblfn(odds)`',
                values: [1, 10, 2],
            });
        });
    });
});
