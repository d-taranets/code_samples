const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require("../config");

module.exports = (sequelize, type) => {
    const User = sequelize.define('users', {
        user: type.STRING,
        first_name: {
            type: type.STRING,
            defaultValue: ''
        },
        last_name: {
            type: type.STRING,
            defaultValue: ''
        },
        email: type.STRING,
        email_key: type.STRING,
        company: type.STRING,
        company_logo: type.TEXT,
        title: type.STRING,
        profile_color_hex: type.STRING,
        profile_photo: type.TEXT,
        is_admin: {
            type: type.BOOLEAN,
            defaultValue: 0
        },
        bio: {
            type: type.TEXT,
            defaultValue: ''
        },
        location: {
            type: type.STRING,
            defaultValue: ''
        },
        age: {
            type: type.NUMERIC,
            defaultValue: null
        },
        region: {
            type: type.STRING,
            defaultValue: ''
        },
        viewed_intro: {
            type: type.BOOLEAN,
            defaultValue: 0
        },
        salt: {
            type: type.STRING,
            defaultValue: ''
        },
        hash: {
            type: type.STRING,
            defaultValue: ''
        },
        stripe_customer: type.STRING,
        events_organized: type.NUMERIC,
        events_attended: type.NUMERIC,
        last_login: type.DATE,
        preferred_language: type.STRING,
        user_group: type.NUMERIC,
        user_timezone: type.STRING,
        default_account: type.STRING,
        blocked_user: {
            type: type.BOOLEAN,
            defaultValue: 0
        },
        in_accounts: type.STRING,
        signup_date: type.DATE,
        completed_start_tasks: type.TEXT
    }, {
        indexes: [
            {
                unique: true,
                fields: ['user']
            },
            {
                fields: ['email']
            },
        ],
        defaultScope: {
            attributes: {exclude: ['salt', 'hash', 'stripe_customer', 'updatedAt', 'createdAt']},
        }
    });

    User.prototype.verifyPassword = function (password) {
        const hashed_pw = crypto.createHash('sha256').update(`data to generate hashed string`).digest('hex');
        return this.hash === hashed_pw;
    };

    User.prototype.generateJWT = function (isRememberMe = false) {
        const today = new Date();

        const expirationDate = isRememberMe
            ? new Date(today.getTime() + config.app.JWT_EXPIRATION_REMEMBER_ME * 60 * 1000)
            : new Date(today.getTime() + config.app.JWT_EXPIRATION * 60 * 1000);

        return jwt.sign({
            email: this.email,
            user: this.user,
            exp: parseInt((expirationDate.getTime() / 1000).toString(), 10),
        }, config.app.JWT_SECRET);
    };

    User.prototype.generateToken = function () {
        return Buffer(JSON.stringify({
            secret: config.app.CHECK_IN_SECRET,
            email: this.email,
            userId: this.user,
        }), 'binary').toString('base64');
    };

    User.prototype.toJSON = function () {
        const values = Object.assign({}, this.get());

        delete values.salt;
        delete values.hash;
        delete values.stripe_customer;
        delete values.createdAt;
        delete values.updatedAt;

        return values;
    };

    return User;
};

