const config = require('../config');
const {Room, Call} = require('../sequelize');
const {createNewCall, handleOpenTokRoom, formatSlug} = require('../utils/opentokUtils');
const OpenTok = require('opentok');
const opentok = new OpenTok(config.app.OPENTOK_API_KEY, config.app.OPENTOK_API_SECRET);

const getUserDataFromRequest = ({query: {fname, lname, otherfname, otherlname, initials}}) => ({
    'userName': fname || null,
    'userLastName': lname || null,
    'otherName': otherfname || null,
    'otherLastName': otherlname || null,
    'currentUserInitials': initials || null,
});

const getConfig = async (req, res) => {
    let {slug} = req.params;
    const {query: {eventId, uid, r, token = ''}} = req;

    const secret = Buffer.from(token, 'base64').toString();
    if (!secret || secret !== config.app.CHECK_IN_SECRET) return res.status(403).send({status: 403, message: 'Unauthorized'});

    const needRecord = r === 'n' ? 0 : 1;
    let interval = null;
    if (!slug) {
        return res.send({status: 404, message: 'Route attribute is missing'});
    }

    slug = formatSlug(slug);

    const [room, isNewRoom] = await handleOpenTokRoom(slug, eventId);
    const requestData = getUserDataFromRequest(req);

    const response = {
        'apiKey': config.app.OPENTOK_API_KEY,
        'uid': uid,
        'roomSlug': slug,
        'needRecord': needRecord,
        'archiveStartUrl': "/records/start/" + slug,
        'archiveStopUrl': "/records/stop/" + slug,
        'trackEventUrl': "/track/" + slug,
        'userData': {
            'userName': requestData.userName,
            'userLastName': requestData.userLastName,
            'otherName': requestData.otherName,
            'otherLastName': requestData.otherLastName,
            'currentUserInitials': requestData.currentUserInitials,
        },
    };
    if (isNewRoom) {
        const call = await createNewCall(room, uid);
        return res.json({
            ...response,
            'sessionId': call.session_id,
            'token': opentok.generateToken(call.session_id, {data: `userId=${uid}`}),
        });
    } else {
        let i = 0;
        interval = setInterval(async () => {
            let updatedRoom = await Room.findOne({where: {slug, event_id: eventId || null}});
            let call = await Call.findOne({where: {id: updatedRoom.call_id}});

            if (call) {
                if (interval) clearInterval(interval);
                if (uid && !call.hasUid(uid)) {
                    call.addUid(uid);
                }
                return res.json({
                    ...response,
                    'sessionId': call.session_id,
                    'token': opentok.generateToken(call.session_id, {data: `userId=${uid}`}),
                });
            } else if (i === 5) {
                if (interval) clearInterval(interval);
                call = await createNewCall(room, uid);
                return res.json({
                    ...response,
                    'sessionId': call.session_id,
                    'token': opentok.generateToken(call.session_id, {data: `userId=${uid}`}),
                });
            }
            return i++;
        }, 1000)
    }
};

const getTestConfig = async (req, res) => {
    const {query: {proceed, uid, token = ''}} = req;

    const secret = Buffer.from(token, 'base64').toString();
    if (!secret || secret !== config.app.CHECK_IN_SECRET) return res.status(403).send({status: 403, message: 'Unauthorized'});

    const session = await (new Promise((resolve) => {
        opentok.createSession({mediaMode: "routed"}, (err, session) => {
            resolve(session);
        })
    }));
    const opentokToken = opentok.generateToken(session.sessionId, {data: `userId=${uid}`});
    const proceedUrl = proceed || '/';

    return res.json({
        'api_key': config.app.OPENTOK_API_KEY,
        'sessionId': session.sessionId,
        'token': opentokToken,
        'proceed_url': proceedUrl,
        'uid': uid,
    });
};

module.exports = {
    getConfig,
    getTestConfig,
};
