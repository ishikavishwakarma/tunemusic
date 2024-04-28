module.exports = {
  content: ['./views/*.ejs'
,
'./node_modules/flowbite/**/*.js'],

  theme: {
    extend: {
      fontFamily:{
        'montserrat':['montserrat'],
        'gilroy':['gilroy']
      }
    },
  },
  plugins: [
    require('flowbite/plugin'),
  {
  tailwindcss: {},
  autoprefixer: {},
  
  },
  ],
  };