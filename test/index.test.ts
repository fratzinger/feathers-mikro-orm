import { Application } from '@feathersjs/feathers';
import { setupApp } from './app';
import { Service } from '../src';
import { NotFound } from '@feathersjs/errors';

describe('feathers-mikro-orm', () => {
  let app: Application;

  beforeAll(async () => {
    app = await setupApp();
  });

  it('defines a service', () => {
    expect(app.service('book')).toBeDefined();
  });

  describe('the book service', () => {
    let service: Service;

    beforeAll(() => {
      service = app.service('book');
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
        expect(book).toBeDefined();
        expect(book.uuid).toBeDefined();
        expect(book.title).toEqual(options.title);
      });

      it('saves the created book', async () => {
        const options = { title: 'test' };
        const book = await service.create(options);
        const savedBook = await service.get(book.uuid);
        expect(book.title).toEqual(savedBook.title);
        expect(book.uuid).toEqual(savedBook.uuid);
      });
    });

    describe('get', () => {
      it('gets a saved book by id', async () => {
        const options = { title: 'test' };
        const initial = await service.create(options);
        const saved = await service.get(initial.uuid);
        expect(initial.title).toEqual(saved.title);
        expect(initial.uuid).toEqual(saved.uuid);
      });
    });

    describe('find', () => {
      it('finds by params.query if params.where is not set', async () => {
        const options = { title: 'test' };
        const options2 = { title: 'another' };
        const initial = await service.create(options);
        await service.create(options2);
        const saved = await service.find({ query: { title: 'test' } });
        expect(saved.length).toEqual(1);
        expect(saved[0].title).toEqual(initial.title);
        expect(saved[0].uuid).toEqual(initial.uuid);
      });

      it('handles $limit query param', async () => {
        const options = { title: 'test' };
        const options2 = { title: 'test' };
        const initial = await service.create(options);
        await service.create(options2);
        const saved = await service.find({ query: { title: 'test', $limit: 1 } });
        expect(saved.length).toEqual(1);
        expect(saved[0].title).toEqual(initial.title);
        expect(saved[0].uuid).toEqual(initial.uuid);
      });
    });

    describe('patch', () => {
      it('updates a saved book by id', async () => {
        const options = { title: 'test' };
        const initial = await service.create(options);
        const patched = await service.patch(initial.uuid, { title: 'updated' });
        expect(patched.title).toEqual('updated');

        const saved = await service.get(initial.uuid);
        expect(saved.title).toEqual(patched.title);
        expect(saved.uuid).toEqual(patched.uuid);
      });
    });

    describe('remove', () => {
      it('deletes a saved book by id', async () => {
        const options = { title: 'test' };
        const initial = await service.create(options);

        await service.remove(initial.uuid);

        try {
          await service.get(initial.uuid);
          fail();
        } catch (e) {
          expect(e).toEqual(new NotFound('Book not found.'));
        }
      });

      it('ignores params when deleting by id', async () => {
        const options = { title: 'test' };
        const params = { query: {} };
        const savedBook = await service.create(options);

        await service.remove(savedBook.uuid, params);

        try {
          await service.get(savedBook.uuid);
          fail();
        } catch (e) {
          expect(e).toEqual(new NotFound('Book not found.'));
        }
      });

      it('returns the deleted book', async () => {
        const options = { title: 'test' };
        const initial = await service.create(options);

        const removed = await service.remove(initial.uuid);
        expect(removed.title).toEqual(initial.title);
        expect(removed.uuid).toEqual(initial.uuid);
      });

      it('deletes many books by params', async () => {
        const options1 = { title: 'test' };
        const options2 = { title: 'test' };
        await service.create(options1);
        await service.create(options2);

        const response = await service.remove(null, { where: { title: 'test' } });
        expect(response).toEqual({ success: true });

        // check that all of the books have been removed
        const found = await service.find();
        expect(found.length).toEqual(0);
      });
    });
  });
});
