const electron = require('electron');
const postis = require('postis');
const { ipcRenderer } = electron;

const {
    POWER_MONITOR_EVENTS_CHANNEL,
    POWER_MONITOR_MESSAGE_NAME,
    POWER_MONITOR_QUERIES_CHANNEL
} = require('./constants');

/**
 * The channel we use to communicate with Jitsi Meet window.
 */
let _channel;

/**
 * The listener for query responses.
 * @param _ - Not used.
 * @param response - The response to send.
 */
let queriesChannelListener = function (_, response) {
    _sendMessage(response);
};

/**
 * The listener we use to listen for power monitor events.
 * @param _ - Not used.
 * @param event - The event.
 */
let eventsChannelListener = function (_, event) {
    _sendEvent(event);
};

/**
 * Sends event to Jitsi Meet.
 *
 * @param {Object} event the remote control event.
 */
function _sendEvent(event) {
    const powerMonitorEvent = Object.assign(
        { name: POWER_MONITOR_MESSAGE_NAME },
        event
    );

    _sendMessage({ data: powerMonitorEvent });
}

/**
 * Sends a message to Jitsi Meet.
 *
 * @param {Object} message the message to be sent.
 */
function _sendMessage(message) {
    _channel.send({
        method: 'message',
        params: message
    });
}

/**
 * Disposes the power monitor functionality.
 */
function dispose() {

    ipcRenderer.removeListener(
        POWER_MONITOR_QUERIES_CHANNEL, queriesChannelListener);
    ipcRenderer.removeListener(
        POWER_MONITOR_EVENTS_CHANNEL, eventsChannelListener);

    if(_channel) {
        _channel.destroy();
        _channel = null;
    }
}

/**
 * Initializes the power monitor in the render process of the
 * window which displays Jitsi Meet.
 *
 * @param iframe - the iframe to send events to.
 */
module.exports = function setupPowerMonitorRender(iframe) {
    iframe.addEventListener('load', () => {
        iframe.contentWindow.addEventListener(
            'unload',
            dispose
        );
        _channel = postis({
            window: iframe.contentWindow,
            windowForEventListening: window,
            scope: 'jitsi-power-monitor'
        });
        _channel.ready(() => {
            _channel.listen('message', message => {
                const { name } = message.data;
                if(name === POWER_MONITOR_MESSAGE_NAME) {
                    ipcRenderer.send(POWER_MONITOR_QUERIES_CHANNEL, message);
                }
            });
        });
    });

    ipcRenderer.on(POWER_MONITOR_QUERIES_CHANNEL, queriesChannelListener);
    ipcRenderer.on(POWER_MONITOR_EVENTS_CHANNEL, eventsChannelListener);
};
