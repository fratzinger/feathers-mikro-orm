import feathers, { Application } from '@feathersjs/feathers';
import { MikroORM, Options } from '@mikro-orm/core';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

import { Service } from '../src/';
import { Book } from './entities/Book';
import { BaseEntity } from './entities/BaseEntity';
import { CommonModel } from './entities/CommonModel';

export async function setupApp (app?: Application): Promise<Application> {
  app = app || feathers();

  const config: Options = {
    type: 'postgresql',
    dbName: 'feathers_mikro_orm_test',
    host: 'localhost',
    entities: [Book, BaseEntity, CommonModel],
    debug: false,
    metadataProvider: TsMorphMetadataProvider
  };

  const orm = await MikroORM.init(config);
  app.set('orm', orm);

  const schemaGenerator = orm.getSchemaGenerator();
  await schemaGenerator.ensureDatabase();

  const updateSchemaSql = await schemaGenerator.getUpdateSchemaSQL();

  await schemaGenerator.execute(updateSchemaSql);

  const bookService = new Service({
    Entity: Book,
    orm
  });

  app.use('/books', bookService);

  app.use('/adapter-test', new Service({
    Entity: CommonModel,
    orm,
    events: ['testing']
  }));

  return app;
}
