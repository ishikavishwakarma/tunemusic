module.exports = {
  content: ['./views/*.ejs'],
  theme: {
    extend: {
      fontFamily:{
        'montserrat':['montserrat'],
        'gilroy':['gilroy']
      }
    },
  },
  plugins: [
  {
  tailwindcss: {},
  autoprefixer: {},
  },
  ],
  };