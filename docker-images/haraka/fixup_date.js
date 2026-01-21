'use strict';

exports.register = function () {
    this.register_hook('data', 'remember_arrival_time');
    this.register_hook('data_post', 'ensure_date_header');
};

exports.remember_arrival_time = function (next, connection) {
    if (connection && connection.transaction) {
        connection.transaction.notes = connection.transaction.notes || {};
        connection.transaction.notes.fixup_date_received = connection.transaction.notes.fixup_date_received || new Date();
    }
    next();
};

exports.ensure_date_header = function (next, connection) {
    const txn = connection && connection.transaction;
    if (!txn) {
        return next();
    }

    const existing = txn.header && txn.header.get('date');
    if (existing && existing.length) {
        return next();
    }

    const receivedAt = txn.notes && txn.notes.fixup_date_received ? new Date(txn.notes.fixup_date_received) : new Date();
    const dateValue = formatDate(receivedAt);

    txn.add_leading_header('Date', dateValue);
    connection.loginfo(this, `Added missing Date header "${dateValue}"`);

    next();
};

function formatDate(date) {
    const safeDate = date instanceof Date && !isNaN(date) ? date : new Date();
    return safeDate.toUTCString().replace(/GMT$/, '+0000');
}
