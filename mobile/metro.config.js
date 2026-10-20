// Конфиг Metro для Expo. Стандартный: расширяет @expo/metro-config.
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = getDefaultConfig(__dirname);
