module.exports = (sequelize, type) => {
    const Call = sequelize.define('calls', {
            session_id: type.STRING,
            archive_id: {
                type: type.TEXT,
                defaultValue: null
            },
            uids: {
                type: type.JSON,
                defaultValue: null
            },
        },
        {
            tableName: 'calls',
            timestamps: true,
            updatedAt: 'updateAt',
            indexes: [
                // Create a unique index
                {
                    fields: ['session_id']
                },
            ]
        });

    Call.prototype.hasUid = function (uid) {
        if (!Array.isArray(JSON.parse(this.uids))) {
            this.uids = JSON.stringify([]);
        }
        return JSON.parse(this.uids).indexOf(uid) !== -1;
    };

    Call.prototype.addUid = function (uid) {
        const arrUids = JSON.parse(this.uids);
        arrUids.push(uid);
        this.uids = JSON.stringify(arrUids);
        this.save();
    };

    return Call;
};
