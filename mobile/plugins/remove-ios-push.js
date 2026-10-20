const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Apple Developer Program недоступен, поэтому push на iOS не подключаем:
 * entitlement aps-environment требует платного профиля и роняет подпись.
 * На Android push остаётся (FCM), на iOS работает Telegram и уведомления в приложении.
 */
module.exports = function removeIosPush(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
