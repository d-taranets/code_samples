const config = require('../config');
const {Room, Call} = require('../sequelize');

const OpenTok = require('opentok');
const opentok = new OpenTok(config.app.OPENTOK_API_KEY, config.app.OPENTOK_API_SECRET);

const createNewCall = async (room, uid = null) => {
    const session = await (new Promise((resolve) => {
        opentok.createSession({mediaMode: "routed"}, (err, session)=>{
            resolve(session);
        })
    }));
    const call = await Call.create({
        session_id: session.sessionId
    });

    room.call_id = call.id;
    await room.save();

    if (uid && !call.hasUid(uid)) {
        call.addUid(uid);
    }

    return call;
};

const handleOpenTokRoom = async (slug, event_id = null) => {
    const [room, isNewRoom] = await Room.findOrCreate({
        where: {
            slug, event_id
        },
        defaults: {
            name: slug,
            slug,
            event_id
        }
    });

    if(isNewRoom) {
        await createNewCall(room)
    }

    return [room, isNewRoom];
};

const formatSlug = (slug) => {
    return slug.replace('/[^\w0-9_]/', '_').toLowerCase();
};

module.exports = {
    createNewCall,
    handleOpenTokRoom,
    formatSlug
};
