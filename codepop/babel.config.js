//module.exports = function(api) {
//  api.cache(true);
//  return {
//    presets: ['babel-preset-expo'],
//  };
//};
console.log("!!! BABEL CONFIG IS LOADING !!!"); // Add this line
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin',],
  };
};