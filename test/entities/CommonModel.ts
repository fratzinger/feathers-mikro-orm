import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'common' })
export class CommonModel {
    @PrimaryKey()
      id!: number;

  @Property({ columnType: 'timestamptz(6)' })
    createdAt = new Date();

  @Property({ columnType: 'timestamptz(6)', onUpdate: () => new Date() })
    updatedAt = new Date();

  @Property()
    name: string;

  @Property({ nullable: true })
    age?: number;

  @Property()
    created: boolean;

  @Property()
    time: number;

  @Property({ default: 'pending' })
    status: string;

  constructor (options: { name: string; age?: number, created?: boolean, time?: number, status?: string }) {
    this.name = options.name;
    this.age = options.age || null as any;
    this.created = options.created || false;
    this.time = options.time || 0;
    this.status = options.status || 'pending';
  }
}
