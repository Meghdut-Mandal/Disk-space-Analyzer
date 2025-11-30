import { Sequelize, DataTypes, Model } from 'sequelize'

let sequelize: Sequelize | null = null
let initPromise: Promise<Sequelize> | null = null

export class DirectoryHistory extends Model {
  public id!: number
  public path!: string
  public name!: string
  public size!: number
  public lastScanned!: Date
  public scanCount!: number
}

export class UserAction extends Model {
  public id!: number
  public type!: string
  public path!: string | null
  public metadata!: string | null
  public timestamp!: Date
}

export async function getDatabase(dbPath: string): Promise<Sequelize> {
  if (sequelize) return sequelize

  if (!initPromise) {
    initPromise = (async () => {
      const seq = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false, // Disable logging for cleaner output
      })

      // Initialize DirectoryHistory model
      DirectoryHistory.init(
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          path: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          name: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          size: {
            type: DataTypes.BIGINT,
            allowNull: false,
          },
          lastScanned: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
          scanCount: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
          },
        },
        {
          sequelize: seq,
          modelName: 'DirectoryHistory',
          indexes: [
            {
              fields: ['lastScanned'],
            },
          ],
        }
      )

      // Initialize UserAction model
      UserAction.init(
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          type: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          path: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
          },
        },
        {
          sequelize: seq,
          modelName: 'UserAction',
          indexes: [
            {
              fields: ['timestamp'],
            },
            {
              fields: ['type'],
            },
          ],
        }
      )

      // Sync models with database
      console.log('Syncing database...')
      await seq.sync()
      console.log('Database synced')

      sequelize = seq
      return seq
    })()
  }

  return initPromise
}

export async function closeDatabase(): Promise<void> {
  if (initPromise) {
    const seq = await initPromise
    await seq.close()
    sequelize = null
    initPromise = null
  }
}
