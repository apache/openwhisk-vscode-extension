function main(params) {
    const msg = 'Hello, ' + params.name + ' from ' + params.place;
    const family = 'You have ' + params.children + ' children ';
    const stats = 'and are ' + params.height + ' m. tall.';
    return { greeting: msg, details: family + stats };
}
module.exports.main = main;
