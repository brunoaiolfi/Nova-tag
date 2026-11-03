module.exports = {
  presets: [
    [
      'babel-preset-expo',
      {
        'react-compiler': {
          sources: filename =>
            /\/src\/components\/(?:ui\/|Nfc\/OrderSelect\.tsx$)/.test(
              filename.replace(/\\/g, '/'),
            ),
          panicThreshold: 'all_errors',
        },
      },
    ],
  ],
};
