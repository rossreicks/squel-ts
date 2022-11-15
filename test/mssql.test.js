import sinon from 'sinon';
import rootSquel from '../src';

let mocker;

const squel = rootSquel.useFlavour('mssql');

let inst, sel, upt;

const areSame = function (actual, expected, message) {
    expect(actual).toEqual(expected);
};

describe('MSSQL flavour', () => {
    beforeEach(() => {
        mocker = sinon.sandbox.create();
    });

    afterEach(() => {
        mocker.restore();
    });

    describe('DATE Conversion', () => {
        beforeEach(() => {
            inst = squel.insert();
        });

        describe('>> into(table).set(field, new Date(2012-12-12T4:30:00Z))', () => {
            beforeEach(() => {
                inst.into('table').set('field', new Date('2012-12-12T04:30:00Z'));
            });
            it('toString', () => {
                areSame(inst.toString(), "INSERT INTO table (field) VALUES (('2012-12-12 4:30:0'))");
            });
        });
    });

    describe('SELECT builder', () => {
        beforeEach(() => {
            sel = squel.select();
        });

        describe('>> from(table).field(field).top(10)', () => {
            beforeEach(() => {
                sel.from('table').field('field').top(10);
            });
            it('toString', () => {
                areSame(sel.toString(), 'SELECT TOP (10) field FROM table');
            });
        });

        describe('>> from(table).field(field).limit(10)', () => {
            beforeEach(() => {
                sel.from('table').field('field').limit(10);
            });
            it('toString', () => {
                areSame(sel.toString(), 'SELECT TOP (10) field FROM table');
            });
        });

        describe('>> from(table).field(field).limit(10).offset(5)', () => {
            beforeEach(() => {
                sel.from('table').field('field').limit(10).offset(5);
            });
            it('toString', () => {
                areSame(sel.toString(), 'SELECT field FROM table OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY');
            });
        });

        describe('>> from(table).field(field).top(10).offset(5)', () => {
            beforeEach(() => {
                sel.from('table').field('field').top(10).offset(5);
            });
            it('toString', () => {
                areSame(sel.toString(), 'SELECT field FROM table OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY');
            });
        });

        describe('>> from(table).field(field).offset(5)', () => {
            beforeEach(() => {
                sel.from('table').field('field').offset(5);
            });
            it('toString', () => {
                areSame(sel.toString(), 'SELECT field FROM table OFFSET 5 ROWS');
            });
        });

        describe('>> from(table).field(field).offset(5).union(...)', () => {
            beforeEach(() => {
                sel.from('table').field('field').offset(5).union(squel.select().from('table2').where('a = 2'));
            });
            it('toString', () => {
                areSame(
                    sel.toString(),
                    'SELECT field FROM table OFFSET 5 ROWS UNION (SELECT * FROM table2 WHERE (a = 2))'
                );
            });
        });

        describe('>> check variables arent being shared', () => {
            it('toString', () => {
                areSame(
                    squel.select().from('table').field('field').top(10).toString(),
                    'SELECT TOP (10) field FROM table'
                );

                areSame(squel.select().from('table').field('field').toString(), 'SELECT field FROM table');
            });
        });
    });

    describe('INSERT builder', () => {
        beforeEach(() => {
            inst = squel.insert();
        });

        describe('>> into(table).set(field, 1).output(id)', () => {
            beforeEach(() => {
                inst.into('table').output('id').set('field', 1);
            });
            it('toString', () => {
                areSame(inst.toString(), 'INSERT INTO table (field) OUTPUT INSERTED.id VALUES (1)');
            });
        });

        describe('>> into(table).set(field, 1).output(id)', () => {
            beforeEach(() => {
                inst.into('table').output(['id', 'name']).set('field', 1);
            });
            it('toString', () => {
                areSame(inst.toString(), 'INSERT INTO table (field) OUTPUT INSERTED.id, INSERTED.name VALUES (1)');
            });
        });
    });

    describe('UPDATE builder', () => {
        beforeEach(() => {
            upt = squel.update();
        });

        describe('>> table(table).set(field, 1).top(12)', () => {
            beforeEach(() => {
                upt.table('table').set('field', 1).top(12);
            });
            it('toString', () => {
                areSame(upt.toString(), 'UPDATE TOP (12) table SET field = 1');
            });
        });

        describe('>> table(table).set(field, 1).limit(12)', () => {
            beforeEach(() => {
                upt.table('table').set('field', 1).limit(12);
            });
            it('toString', () => {
                areSame(upt.toString(), 'UPDATE TOP (12) table SET field = 1');
            });
        });

        describe('>> table(table).set(field, 1).output(id)', () => {
            beforeEach(() => {
                upt.table('table').output('id').set('field', 1);
            });
            it('toString', () => {
                areSame(upt.toString(), 'UPDATE table SET field = 1 OUTPUT INSERTED.id');
            });
        });

        describe('>> table(table).set(field, 1).outputs(id AS ident, name AS naming)', () => {
            beforeEach(() => {
                upt.table('table')
                    .outputs({
                        id: 'ident',
                        name: 'naming',
                    })
                    .set('field', 1);
            });
            it('toString', () => {
                areSame(
                    upt.toString(),
                    'UPDATE table SET field = 1 OUTPUT INSERTED.id AS ident, INSERTED.name AS naming'
                );
            });
        });
    });

    describe('DELETE builder', () => {
        beforeEach(() => {
            upt = squel.delete();
        });

        describe('>> from(table)', () => {
            beforeEach(() => {
                upt.from('table');
            });
            it('toString', () => {
                areSame(upt.toString(), 'DELETE FROM table');
            });
        });

        describe('>> from(table).output(id)', () => {
            beforeEach(() => {
                upt.from('table').output('id');
            });
            it('toString', () => {
                areSame(upt.toString(), 'DELETE FROM table OUTPUT DELETED.id');
            });
        });

        describe('>> from(table).outputs(id AS ident, name AS naming).where("a = 1")', () => {
            beforeEach(() => {
                upt.from('table')
                    .outputs({
                        id: 'ident',
                        name: 'naming',
                    })
                    .where('a = 1');
            });
            it('toString', () => {
                areSame(
                    upt.toString(),
                    'DELETE FROM table OUTPUT DELETED.id AS ident, DELETED.name AS naming WHERE (a = 1)'
                );
            });
        });
    });

    it('Default query builder options', () => {
        areSame(
            {
                autoQuoteTableNames: false,
                autoQuoteFieldNames: false,
                autoQuoteAliasNames: false,
                useAsForTableAliasNames: false,
                nameQuoteCharacter: '`',
                tableAliasQuoteCharacter: '`',
                fieldAliasQuoteCharacter: '"',
                valueHandlers: [],
                parameterCharacter: '?',
                numberedParameters: false,
                numberedParametersPrefix: '@',
                numberedParametersStartAt: 1,
                replaceSingleQuotes: true,
                singleQuoteReplacement: "''",
                separator: ' ',
                stringFormatter: null,
                rawNesting: false,
            },
            squel.defaultOptions
        );
    });
});
