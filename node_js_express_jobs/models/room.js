module.exports = (sequelize, type) => sequelize.define('rooms', {
        call_id: {
            type: type.INTEGER,
            defaultValue: null
        },
        event_id: {
            type: type.STRING,
            defaultValue: null
        },
        type: {
            type: type.STRING,
            defaultValue: "one2one"
        },
        name: type.TEXT,
        slug: type.STRING,
        record: {
            type: type.NUMERIC,
            defaultValue: 1
        },
    },
    {
        tableName: 'rooms',
        timestamps: true,
        updatedAt: 'updateAt',
        indexes: [
            // Create index
            {
                fields: ['call_id']
            },
            {
                fields: ['slug']
            },
        ]
    }
);



