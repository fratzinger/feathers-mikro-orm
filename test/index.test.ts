import feathers, { Application, Paginated } from '@feathersjs/feathers';
import { setupApp } from './app';
import createService, { Service } from '../src';
import errors, { NotFound } from '@feathersjs/errors';
import { Book } from './entities/Book';
import adapterTests from '@feathersjs/adapter-tests';
import assert from 'assert';

const testSuite = adapterTests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.update + query + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multi query same',
  '.patch multi query changed',
  '.patch + query + NotFound',
  '.patch + NotFound',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id',
  '.get + id + query id'
]);

describe('feathers-mikro-orm', () => {
  let app: Application = feathers();

  describe('commons', () => {
    before(async () => {
      app = await setupApp(app);
    });

    afterEach(async () => {
      const orm = app.get('orm');
      const connection = orm.em.getConnection();
      await connection.execute('DELETE FROM common;');
    });

    testSuite(app, errors, 'adapter-test', 'id');
  });

  describe('mikro orm', () => {
    beforeEach(async () => {
      app = await setupApp();
    });

    it('defines a service', () => {
      assert.ok(app.service('books'));
    });

    describe('the book service', () => {
      let service: Service;

      beforeEach(() => {
        service = app.service('books');
      });

      afterEach(async () => {
        const orm = app.get('orm');
        const connection = orm.em.getConnection();
        await connection.execute('DELETE FROM book;');
      });

      describe('create', () => {
        it('creates a book', async () => {
          const options = { title: 'test' };
          const book = await service.create(options);
          assert.ok(book);
          assert.ok(book.uuid);
          assert.deepEqual(book.title, options.title);
        });

        it('saves the created book', async () => {
          const options = { title: 'test' };
          const book = await service.create(options);
          const savedBook = await service.get(book.uuid);
          assert.deepStrictEqual(savedBook, book);
        });
      });

      describe('get', () => {
        it('gets a saved book by id', async () => {
          const options = { title: 'test' };
          const initial = await service.create(options);
          const saved = await service.get(initial.uuid);
          assert.deepStrictEqual(saved, initial);
        });
      });

      describe('find', () => {
        it('returns all entities if there are no params', async () => {
          const options = { title: 'test' };
          const options2 = { title: 'another' };
          const book1 = await service.create(options);
          const book2 = await service.create(options2);
          const saved = await service.find() as Book[];

          assert.strictEqual(saved.length, 2);
          assert.deepStrictEqual(saved.sort(), [book1, book2].sort());
        });

        it('finds by query params', async () => {
          const options = { title: 'test' };
          const options2 = { title: 'another' };
          const book1 = await service.create(options);
          const book2 = await service.create(options2);
          const saved = await service.find({ query: { title: 'test' } }) as Book[];

          assert.strictEqual(saved.length, 1);

          assert.deepStrictEqual(saved[0], book1);
        });

        it('honors feathers options passed as query params', async () => {
          const options = { title: 'test' };
          const options2 = { title: 'another' };
          const book1 = await service.create(options);
          const book2 = await service.create(options2);
          // sort/order results using feathers $sort query param
          const saved = await service.find({ query: { $sort: { title: 1 } } }) as Book[];

          assert.strictEqual(saved.length, 2);
          assert.deepStrictEqual(saved[0], book2);
          assert.deepStrictEqual(saved[1], book1);
        });

        it('honors mikro-orm options passed as params.options', async () => {
          const options = { title: 'test' };
          const options2 = { title: 'another' };
          const book1 = await service.create(options);
          const book2 = await service.create(options2);
          // sort/order results using mikro-orm orderBy option in params
          const saved = await service.find({ options: { orderBy: { title: 'ASC' } } }) as Book[];

          assert.strictEqual(saved.length, 2);
          assert.deepStrictEqual(saved[0], book2);
          assert.deepStrictEqual(saved[1], book1);
        });

        describe('pagination', () => {
          it('returns a Paginated object if $limit query param is set', async () => {
            const options = { title: 'test' };
            const options2 = { title: 'test' };
            const options3 = { title: 'test' };
            const book1 = await service.create(options);
            const book2 = await service.create(options2);
            await service.create(options3);
            const result = await service.find({ query: { title: 'test', $limit: 2 } }) as Paginated<Book>;

            assert.strictEqual(result.total, 3);
            assert.strictEqual(result.limit, 2);
            assert.strictEqual(result.skip, 0);
            assert.strictEqual(result.data.length, 2);
            assert.deepStrictEqual(result.data.sort(), [book1, book2].sort());
          });

          it('offsets results by $skip query param', async () => {
            const options = { title: 'test' };
            const options2 = { title: 'test' };
            const options3 = { title: 'test' };
            const book1 = await service.create(options);
            const book2 = await service.create(options2);
            const book3 = await service.create(options3);
            const result = await service.find({ query: { title: 'test', $limit: 2, $skip: 1 } }) as Paginated<Book>;

            assert.strictEqual(result.total, 3);
            assert.strictEqual(result.limit, 2);
            assert.strictEqual(result.skip, 1);
            assert.strictEqual(result.data.length, 2);
            assert.deepStrictEqual(result.data.sort(), [book2, book3].sort());
          });

          it('uses default limit set at service initialization if no $limit query param is set', async () => {
            const options = { title: 'test' };
            const options2 = { title: 'test' };
            const options3 = { title: 'test' };

            const paginatedService = createService({
              orm: app.get('orm'),
              Entity: Book,
              paginate: { default: 1 }
            });

            const book = await paginatedService.create(options);
            await paginatedService.create(options2);
            await paginatedService.create(options3);
            const result = await paginatedService.find({ query: { title: 'test' } }) as Paginated<Book>;

            assert.strictEqual(result.total, 3);
            assert.strictEqual(result.limit, 1);
            assert.strictEqual(result.skip, 0);
            assert.strictEqual(result.data.length, 1);
            assert.deepStrictEqual(result.data.sort(), [book].sort());
          });

          it('honors max limit set at service initialization', async () => {
            const options = { title: 'test' };
            const options2 = { title: 'test' };
            const options3 = { title: 'test' };

            const paginatedService = createService({
              orm: app.get('orm'),
              Entity: Book,
              paginate: { default: 1, max: 2 }
            });

            const book1 = await paginatedService.create(options);
            const book2 = await paginatedService.create(options2);
            await paginatedService.create(options3);

            // test with a limit set in params
            const resultWithLimit = await paginatedService.find({ query: { title: 'test', $limit: 3 } }) as Paginated<Book>;

            assert.strictEqual(resultWithLimit.total, 3);
            assert.strictEqual(resultWithLimit.limit, 2);
            assert.strictEqual(resultWithLimit.skip, 0);
            assert.strictEqual(resultWithLimit.data.length, 2);
            assert.deepStrictEqual(resultWithLimit.data.sort(), [book1, book2].sort());

            // test without a limit set in params
            const resultWithoutLimit = await paginatedService.find({ query: { title: 'test' } }) as Paginated<Book>;

            assert.strictEqual(resultWithoutLimit.total, 3);
            assert.strictEqual(resultWithoutLimit.limit, 2);
            assert.strictEqual(resultWithoutLimit.skip, 0);
            assert.strictEqual(resultWithoutLimit.data.length, 2);
            assert.deepStrictEqual(resultWithoutLimit.data.sort(), [book1, book2].sort());
          });
        });
      });

      describe('patch', () => {
        it('updates a saved book by id', async () => {
          const options = { title: 'test' };
          const initial = await service.create(options);
          const patched = await service.patch(initial.uuid, { title: 'updated' });
          assert.strictEqual(patched.title, 'updated');

          const saved = await service.get(initial.uuid);
          assert.deepStrictEqual(saved, patched);
        });

        it('updates multiple books by query params', async () => {
          const options1 = { title: 'test', version: '1', popularity: 1 };
          const options2 = { title: 'test', version: '2', popularity: 1 };
          const book1 = await service.create(options1);
          const book2 = await service.create(options2);

          const patched = await service.patch(null, { popularity: 10 }, { title: 'test' });

          assert.strictEqual(patched.length, 2);
          assert.strictEqual(patched[0].popularity, 10);
          assert.strictEqual(patched[1].popularity, 10);

          const saved1 = await service.get(book1.uuid);
          assert.deepStrictEqual(saved1, patched[0]);
          const saved2 = await service.get(book2.uuid);
          assert.deepStrictEqual(saved2, patched[1]);
        });
      });

      describe('remove', () => {
        it('deletes a saved book by id', async () => {
          const options = { title: 'test' };
          const initial = await service.create(options);

          await service.remove(initial.uuid);

          let called = false;

          try {
            await service.get(initial.uuid);
            assert.fail();
          } catch (e: any) {
            assert.deepStrictEqual(e.message, 'Book not found.');
            called = true;
          }

          assert.ok(called);
        });

        it('ignores params when deleting by id', async () => {
          const options = { title: 'test' };
          const params = { query: {} };
          const savedBook = await service.create(options);

          await service.remove(savedBook.uuid, params);

          let called = false;

          try {
            await service.get(savedBook.uuid);
            assert.fail();
          } catch (e: any) {
            assert.deepStrictEqual(e.message, 'Book not found.');
            called = true;
          }

          assert.ok(called);
        });

        it('returns the deleted book', async () => {
          const options = { title: 'test' };
          const initial = await service.create(options);

          const removed = await service.remove(initial.uuid);
          assert.deepStrictEqual(removed, initial);
        });

        it('deletes many books by params', async () => {
          const options1 = { title: 'test' };
          const options2 = { title: 'test' };
          await service.create(options1);
          await service.create(options2);

          const response = await service.remove(null, { where: { title: 'test' } });
          assert.deepStrictEqual(response, { success: true });

          // check that all of the books have been removed
          const found = await service.find() as Book[];
          assert.strictEqual(found.length, 0);
        });
      });
    });
  });
});
