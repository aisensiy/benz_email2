module.exports = function(grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        // secrets.json is ignored in git because it contains sensitive data
        // See the README for configuration settings
        secrets: grunt.file.readJSON('secrets.json'),

        // Re-usable filesystem paths (these shouldn't be modified)
        paths: {
          src:        'src',
          src_img:    'src/img',
          dist:       'dist',
          dist_img:   'dist/img'
        },





        // Takes your scss files and compiles them to css
        sass: {
          dist: {
            options: {
              style: 'expanded'
            },
            files: {
              '<%= paths.src %>/css/main.css': '<%= paths.src %>/css/scss/main.scss'
            }
          }
        },





        // Assembles your email content with html layout
        assemble: {
          options: {
            layoutdir: '<%= paths.src %>/layouts',
            partials: ['<%= paths.src %>/partials/**/*.hbs'],
            data: ['<%= paths.src %>/data/*.{json,yml}'],
            flatten: true
          },
          pages: {
            src: ['<%= paths.src %>/emails/*.hbs'],
            dest: '<%= paths.dist %>/'
          }
        },





        // Replace compiled template images sources from ../src/html to ../dist/html
        img_replace: {
          src_images: {
            options: {
              usePrefix: false,
              patterns: [
                {
                  match: /(<img[^>]+[\"'])(\.\.\/src\/img\/)/gi,  // Matches <img * src="../src/img or <img * src='../src/img'
                  replacement: '$1../<%= paths.dist_img %>/'
                },
                {
                  match: /(url\(*[^)])(\.\.\/src\/img\/)/gi,  // Matches url('../src/img') or url(../src/img) and even url("../src/img")
                  replacement: '$1../<%= paths.dist_img %>/'
                }
              ]
            },
            files: [{
              expand: true,
              flatten: true,
              src: ['<%= paths.dist %>/*.html'],
              dest: '<%= paths.dist %>'
            }]
          },
          src_images_cdn: {
            options: {
              usePrefix: false,
              patterns: [
                {
                  match: /\/dist\/img\/benz\//gi,  // Matches <img * src="../src/img or <img * src='../src/img'
                  replacement: ''
                },
                {
                  match: /\/dist\/img\/benz\//gi,  // Matches <img * src="../src/img or <img * src='../src/img'
                  replacement: ''
                }
              ]
            },
            files: [{
              expand: true,
              flatten: true,
              src: ['<%= paths.dist %>/*.html'],
              dest: '<%= paths.dist %>'
            }]
          }
        },





        // Inlines your css
        premailer: {
          html: {
            options: {
              removeComments: true
            },
            files: [{
                expand: true,
                src: ['<%= paths.dist %>/*.html'],
                dest: ''
            }]
          }
          // txt: {
          //   options: {
          //     mode: 'txt'
          //   },
          //   files: [{
          //       expand: true,
          //       src: ['<%= paths.dist %>/*.html'],
          //       dest: '',
          //       ext: '.txt'
          //   }]
          // }
        },





        // Optimize images
        imagemin: {
          dynamic: {
            options: {
              optimizationLevel: 3,
              svgoPlugins: [{ removeViewBox: false }]
            },
            files: [{
              expand: true,
              cwd: '<%= paths.src_img %>',
              src: ['**/*.{png,jpg,gif}'],
              dest: '<%= paths.dist_img %>'
            }]
          }
        },





        // Watches for changes to css or email templates then runs grunt tasks
        watch: {
          files: ['<%= paths.src %>/css/scss/*','<%= paths.src %>/emails/*','<%= paths.src %>/layouts/*','<%= paths.src %>/partials/*','<%= paths.src %>/data/*'],
          tasks: ['default']
        },





        // Use Mailgun option if you want to email the design to your inbox or to something like Litmus
        // grunt send --template=transaction.html
        mailgun: {
          mailer: {
            options: {
              key: '<%= secrets.mailgun.api_key %>', // See README for secrets.json or replace this with your own key
              sender: '<%= secrets.mailgun.sender %>', // See README for secrets.json or replace this with your preferred sender
              recipient: grunt.option('to'), // See README for secrets.json or replace this with your preferred recipient
              subject: 'This is a test email'
            },
            src: ['<%= paths.dist %>/'+grunt.option('template')]
          }
        },





        // Use Rackspace Cloud Files if you're using images in your email
        cloudfiles: {
          prod: {
            'user': '<%= secrets.cloudfiles.user %>', // See README for secrets.json or replace this with your user
            'key': '<%= secrets.cloudfiles.key %>', // See README for secrets.json or replace this with your own key
            'region': '<%= secrets.cloudfiles.region %>', // See README for secrets.json or replace this with your region
            'upload': [{
              'container': '<%= secrets.cloudfiles.container %>', // See README for secrets.json or replace this with your container name
              'src': '<%= paths.src_img %>/*',
              'dest': '/',
              'stripcomponents': 0
            }]
          }
        },

        // CDN will replace local paths with your Cloud CDN path
        cdn: {
          options: {
            cdn: '<%= secrets.cloudfiles.uri %>', // See README for secrets.json or replace this with your cdn uri
            flatten: true,
            supportedTypes: 'html'
          },
          dist: {
            cwd: '<%= paths.dist %>',
            dest: '<%= paths.dist %>',
            src: ['*.html']
          }
        },





        // Use Amazon S3 for images
        s3: {
          options: {
            key: '<%= secrets.s3.key %>', // define this in secrets.json
            secret: '<%= secrets.s3.secret %>', // define this in secrets.json
            access: 'public-read',
            region: 'us-east-1', // feel free to change this
            headers: {
              // Two Year cache policy (1000 * 60 * 60 * 24 * 730)
              "Cache-Control": "max-age=630720000, public",
              "Expires": new Date(Date.now() + 63072000000).toUTCString()
            }
          },
          dev: {
            options: {
              maxOperations: 20,
              bucket: 'BUCKET-NAME' // define this
            },
            upload: [
              {
                src: 'dist/**/*',
                dest: 'public/emails/', // define this
                rel: 'dist', // rel must be set to maintain directory structure of src
                options: { gzip: true }
              }
            ]
          }
        },





        // Send your email template to Litmus for testing
        // grunt litmus --template=transaction.html
        litmus: {
          test: {
            src: ['<%= paths.dist %>/'+grunt.option('template')],
            options: {
              username: '<%= secrets.litmus.username %>', // See README for secrets.json or replace this with your username
              password: '<%= secrets.litmus.password %>', // See README for secrets.json or replace this with your password
              url: 'https://litmus.com', // See README for secrets.json or replace this with your company url
              clients: ['aolonline', 'androidgmailapp', 'aolonline', 'ffaolonline',
              'chromeaolonline', 'appmail6', 'iphone6', 'ipadmini', 'ipad', 'chromegmailnew',
              'ol2002', 'ol2003', 'ol2007', 'ol2010', 'ol2011',
              'ol2013', 'outlookcom', 'chromeoutlookcom', 'chromeyahoo'] // https://#{company}.litmus.com/emails/clients.xml
            }
          }
        },

        text_replace: {
          cdn_replace: {
            src: ['dist/*.html'],
            overwrite: true,
            replacements: [{
              from: /\/dist\/img\/benz\//gi,
              to: ''
            }, {
              from: /\/src\/img\/benz\//gi,
              to: ''
            }]
          }
        }

    });





    // Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('assemble');
    grunt.loadNpmTasks('grunt-mailgun');
    grunt.loadNpmTasks('grunt-premailer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-cloudfiles');
    grunt.loadNpmTasks('grunt-cdn');
    // grunt.loadNpmTasks('grunt-s3');
    grunt.loadNpmTasks('grunt-litmus');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-replace');

    // Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.renameTask('replace', 'img_replace');
    grunt.registerTask('default', ['sass','assemble','premailer','imagemin:dynamic','img_replace:src_images']);

    // Use grunt send if you want to actually send the email to your inbox
    grunt.registerTask('send', ['mailgun']);

    // Upload images to our CDN on Rackspace Cloud Files
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.renameTask('replace', 'text_replace');
    grunt.registerTask('cdnify', ['cdn', 'text_replace:cdn_replace']);

    // Separate task to manually upload files to Amazon S3 bucket
    // grunt.registerTask('upload', ['s3']);

};
