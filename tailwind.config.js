module.exports = {
  content: ['./views/*.ejs'
,
'./node_modules/flowbite/**/*.js'],

  theme: {
    extend: {
      fontFamily:{
        'montserrat':['Montserrat'],
        'nunito':['Nunito']
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