$(document).ready(function() {
  /// INITIALIZE GAME VARIABLES ///
  var NUM_ROUNDS = 20; // Should be 20 in full game
  var strict = false;
  var pattern;
  var playerPattern;
  var displayTime;
  var colors = ['red', 'green', 'yellow', 'blue'];

  /// LOAD HELP FILE ///
  $(".modal-body").load("game_instructions.html");

  /// SOUND VARIABLES ///  
  /* from jetcityorange.com */
  var redSound = document.createElement('audio');
  redSound.setAttribute('src', 'sounds/A3-220.mp3');
  var blueSound = document.createElement('audio');
  blueSound.setAttribute('src', 'sounds/B3-246.mp3');
  var yellowSound = document.createElement('audio');
  yellowSound.setAttribute('src', 'sounds/Csharp4-277.mp3');
  var greenSound = document.createElement('audio');
  greenSound.setAttribute('src', 'sounds/D4-293.mp3');
  /* from soundbible.com */
  var tadaSound = document.createElement('audio');
  tadaSound.setAttribute('src', 'sounds/TaDa.mp3');
  /* from freesound.org */
  var wrongSound = document.createElement('audio');
  wrongSound.setAttribute('src', 'sounds/wrong_buzzer_sound.mp3');

  var sounds = {
    red: redSound,
    blue: blueSound,
    yellow: yellowSound,
    green: greenSound,
    tada: tadaSound,
    wrong: wrongSound
  }

  var soundOn = true;
  $("#sound").click(function() {
    if (soundOn == true) {
      soundOn = false;
      $(this).html("<i class='material-icons'>volume_off</i>");
      for (var sound in sounds) {
        sounds[sound].muted = true;
      }
    } else {
      soundOn = true;
      $(this).html("<i class='material-icons'>volume_up</i>");
      for (var sound in sounds) {
        sounds[sound].muted = false;
      }
    }
  });

  /// EFFECTS AND DISPLAY ///    
  function lightUp(color) {
    $("#" + color).addClass("light");
  }

  function unLighten(color) {
    $("#" + color).removeClass("light");
  }

  var effectsDfd;
  var effectsTimeout;

  function startEffects() {
    effectsDfd = $.Deferred();
    displayCount('none');
    effectsTimeout = setTimeout(function() {
      displayCount('--');
      effectsTimeout = setTimeout(function() {
        displayCount('none');
        effectsTimeout = setTimeout(function() {
          effectsDfd.resolve();
        }, 400);
      }, 300);
    }, 300);
    return effectsDfd;
  }

  function wrongMoveEffects() {
    effectsDfd = $.Deferred();
    // Wrong sound
    effectsTimeout = setTimeout(function() {
      sounds.wrong.play();
      // Blinking 'x's
      effectsTimeout = setTimeout(function() {
        displayCount('XX');
        effectsTimeout = setTimeout(function() {
          displayCount('none');
          effectsTimeout = setTimeout(function() {
            displayCount('XX');
            // Effects finished
            effectsTimeout = setTimeout(function() {
              effectsDfd.resolve();
            }, 200);
          }, 200);
        }, 300);
      }, 100);
    }, 200);
    return effectsDfd;
  }

  function gameWonEffects() {
    effectsDfd = $.Deferred();
    effectsTimeout = setTimeout(function() {
      // Triumphant sound
      sounds.tada.play();
      // Light up board
      for (var i in colors) {
        lightUp(colors[i]);
      }
      // Blinking exclamation points
      displayCount('!!');
      effectsTimeout = setTimeout(function() {
        displayCount('none');
        effectsTimeout = setTimeout(function() {
          displayCount('!!');
          effectsTimeout = setTimeout(function() {
            displayCount('none');
            effectsTimeout = setTimeout(function() {
              displayCount('!!');
              setTimeout(function() {
                // Finish effects
                for (var i in colors) {
                  unLighten(colors[i]);
                }
                effectsDfd.resolve();
              }, 200);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    }, 1000);
    return effectsDfd;
  }

  function clickEffects() {
    $(".quarter").mousedown(function() {
      var color = $(this).attr('id');
      lightUp(color);
      sounds[color].play();
    }).mouseup(function() {
      var color = $(this).attr('id');
      unLighten(color);
      sounds[color].pause();
    }).mouseleave(function() {
      var color = $(this).attr('id');
      unLighten(color);
      sounds[color].pause();
    });
  }

  function displayCount(num) {
    if (num == 'none') {
      num = '';
    } else if (num < 10) {
      num = "0" + num;
    }
    $("#counter-box").text(num);
  }

  var interval; // id for setInterval, set as global so it can be cleared by the "off" button
  function displayPattern(patternToShow) {
    var patternDfd = $.Deferred();
    var i = 0;
    interval = setInterval(displayColor, 2 * displayTime);

    function displayColor() {
      if (i >= patternToShow.length) {
        clearInterval(interval);
        patternDfd.resolve();
      } else {
        var color = patternToShow[i];
        lightUp(color);
        sounds[color].play();
        setTimeout(function() {
          unLighten(color);
          sounds[color].pause();
        }, displayTime);
        i += 1;
      }
    }
    return patternDfd;
  }

  /// COMPUTER PART OF THE GAME ///
  function choose() {
    /* Returns one of the 4 colors, chosen randomly */
    var num = Math.floor(Math.random() * 4); // chooses a number from 0-3    
    return colors[num];
  }

  function playOneRound(callback) {
    /* Speed up after certain rounds */
    if (pattern.length <= 5) {
      displayTime = 700;
    } else if (pattern.length > 5 && pattern.length <= 9) {
      displayTime = 600;
    } else if (pattern.length > 9 && pattern.length <= 13) {
      displayTime = 500;
    } else if (pattern.length > 13) {
      displayTime = 400;
    }
    /* Display pattern */
    displayCount(pattern.length);
    var displayPromise = displayPattern(pattern);
    displayPromise.done(function() {
      /* Wait for user to input pattern */
      var userPromise = userTurn();
      userPromise.done(function() {
        callback();
      });
    });
  }

  function playGame(n) {
    if (n > 0) {
      /* Reset sounds to play from beginning*/
      for (var i in colors) {
        sounds[colors[i]].currentTime = 0;
      }
      /* Add to the pattern */
      pattern.push(choose());
      playOneRound(function() {
        /* This function will run after the rest of playOneRound finishes */ 
        $(".quarter").css("cursor", "default");
        $(".quarter").off();
        playGame(n - 1);
      });
    } else {
      /* Player won! */
      gameWonEffects();
    }
  }

  /// USER PART OF THE GAME ///
  var tooLong; // timeout id, set as global so it can be cleared by "off" button
  function userTurn() {
    $(".quarter").css("cursor", "pointer");
    clickEffects(); // Turn on light and sound effects when user clicks a color
    var userTurnDfd = $.Deferred();
    /* If player takes more than 5 seconds to go, 
    counts as a wrong move */
    tooLong = setTimeout(function() {
      var wrongMovePromise = wrong();
      wrongMovePromise.done(function() {        
        userTurnDfd.resolve();
      });
    }, 5000);
    playerPattern = [];
    $(".quarter").click(function() {
      clearTimeout(tooLong);
      var color = $(this).attr('id');
      playerPattern.push(color);

      /* Check if player made a mistake */
      if (!patternOK(playerPattern)) {
        var wrongMovePromise = wrong();
        wrongMovePromise.done(function() {          
          userTurnDfd.resolve();
        });
        /* Player input ok so far */
      } else {
        /* Make sure after each click
        that player doesn't take too long */
        tooLong = setTimeout(function() {
          var wrongMovePromise = wrong();
          wrongMovePromise.done(function() {            
            userTurnDfd.resolve();
          });
        }, 5000);
        /* Once pattern is finished successfully, 
        game moves on */
        if (playerPattern.length == pattern.length) {
          clearTimeout(tooLong); 
          userTurnDfd.resolve();
        }
      }
    });
    return userTurnDfd;
  }

  function patternOK(patternToCheck) {
    for (var i = 0; i < patternToCheck.length; i++) {
      if (patternToCheck[i] != pattern[i]) {
        return false;
      }
    }
    return true;
  }

  function wrong() {
    var wrongDfd = $.Deferred();
    $(".quarter").css("cursor", "default");
    $(".quarter").off();
    var effectsRunningPromise = wrongMoveEffects();
    effectsRunningPromise.done(function() {
      /* Strict mode on */
      if (strict) {
        start();
      }
      /* Normal play (not strict) */
      else {
        /* Replay pattern */
        playOneRound(function() {
          /* Once pattern completed successfully, 
          finish userTurn */
          wrongDfd.resolve();
        });
      }
    });
    return wrongDfd;
  }
  
  /// GAMEBOARD CONTROL FUNCTIONS ///
  $('#on-off-toggle').click(function() {
    $(this).find('.switch').toggleClass('active');
    var state = $('.active').attr("id");
    if (state == 'on') {
      displayCount('--');
    } else if (state == 'off') {
      effectsDfd.resolve();
      reset();
      displayCount('none');
    }
  });

  $('#start-button').click(function() {
    if ($('.active').attr("id") == 'on') {
      reset();
      start();
    }
  });

  function start() {
    var effectsRunningPromise = startEffects();
    effectsRunningPromise.done(function() {
      playGame(NUM_ROUNDS);
    });
  }

  function reset() {
    pattern = [];
    clearInterval(interval); // Stop any displayPattern in progress
    clearTimeout(tooLong); // Stop setTimeout from showing wrong move when nothing is clicked
    clearTimeout(effectsTimeout);
    $(".quarter").css("cursor", "default");   
    $(".quarter").off();
    for (var sound in sounds) {
      sounds[sound].pause();
      sounds[sound].currentTime = 0;
    }
    for (var i in colors) {
      unLighten(colors[i]);
    }
  }

  $('#strict-button').click(function() {
    $('#strict-light').toggleClass('light-on light-off');
    strict = !strict; // toggle between true and false (on and off)
  });

});