$(document).ready(function(){
  
  orientation();
  new Gyroscope().setAngle();
  var roof, roofId, lat, long,
  angle, material, shader_interval;
  
  // Create roof, then fetch lat lon
  $('#createRoof').click(function() {
    $.post('/roofs/new').then(function(data) {
      
      // Store roof id to body
      roofId = $.parseJSON(data).id
      $('body').attr('data-roof-id', roofId);
      
      // Fetch lat and lon, store in body
      navigator.geolocation.getCurrentPosition(function(pos,err) {
        if (err) { log(err); };
        
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude
        
        $('body').attr("data-lat", lat);
        $('body').attr("data-lon", lon);
        
        $.post('/roofs/' + roofId + '/geolocation', { latitude: lat, longitude: lon });
      });
    });
  });

  $('.material_icon').click(function() {
    $('.material_icon').removeClass('selected');
    $(this).addClass('selected');
    material = this.innerHTML;
  });

  $('#shader').change(function() {
    if ($('#shader').val() === '0') {
      $('#shade').text('Looks clear');
    }
    else if ($('#shader').val() === '1') {
      $('#shade').text('Nothing major');
    }
    else {
      $('#shade').text('Looks shady');
    }
  });
  
  $('.button').click(function() {
    $(this).addClass('clicked');
  });
  
  $('.beta .button').click(function() {
    $('.beta').hide();
  });

  $('body').on("touchend", "#shader", function() {
    clearInterval(shader_interval);
  });
  
  $('body').on("click", ".help-open", function(e) {
    e.stopPropagation();
    e.preventDefault();
    
    var el = $(this).parent().find(".help")
    el.show()
      .addClass("bounceInDown")
      .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
        el.removeClass("bounceInDown");
      });
  });
  
  $('body').on("click", ".help-close", function(e) {
    e.stopPropagation();
    e.preventDefault();
    
    var el = $(this).closest(".help")
    
    el.addClass("bounceOutUp")
      .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
        el.removeClass("bounceOutUp");
        el.hide();
      });
  });

  // POST orientation
  $('#orientationPost').click(function() {
    var orientation = $('body').data('orientation');
    $.post('/roofs/' + roofId + '/orientation', {orientation: orientation});
  });
  
  $('.roof_type').click(function() {
    $('.roof_type').removeClass('selected');
    $(this).addClass('selected');
    if ($(this).attr("id") == "slopedRoof") {
      divert('page_roof_angle');
    } else {
      divert('page_photo');
    }
  });
  
  // POST roof-type
  $('#roofTypePost').click(function() {
    if($('#flatRoof').hasClass('selected')) {
      $.post('/roofs/' + roofId + '/angle', { angle: 0 });
    }
  });

  // POST roof-angle
  $('#roofAnglePost').click(function() {
    angle = $('body').data('angle');
    $.post('/roofs/' + roofId + '/angle', { angle: angle });
  });

  // POST material
  $('#roofMaterialPost').click(function() {
    var material = $('.material.selected').attr('id');
    $.post('/roofs/' + roofId + '/material', { material: material });
  });
  
  $('.material').click(function() {
    $('.material').removeClass('selected');
    $(this).addClass('selected');
  });

  // POST shading
  $('#shadePost').click(function() {
    var shade = $('.roof_shade.selected').data('value');
    $.post('/roofs/' + roofId + '/shading', { shade: shade });
    initMap();
  });
  
  $('.roof_shade').click(function() {
    $('.roof_shade').removeClass('selected');
    $(this).addClass('selected');
  });

  $('#measurementsPost').click(function() {
    console.log('yes');
    
    var angled = $('body').attr('data-angled');
    var gutter = $('body').attr('data-gutter');
    
    $.post('/roofs/' + roofId + '/measurements', { angled_edge: angled, gutter_edge: gutter })
    .then(function(data) {
      roof = $.parseJSON(data);
      $('#panelCapacity').html(roof.panel_capacity);
      $('#powerCapacity').html(roof.power_capacity);
      $('#homesToPower').html(roof.homes_to_power);
      $('#roofMaterial').html(roof.material);
      $('#roofShade').html(roof.shade);
      $('#roofAngle').html(roof.angle);
    });
  });

  // POST results
  $('#userPost').click(function(event) {
    var userEmail = $('#user_email').val();
    
    $.post('/roofs/' + roofId + '/capacity', { user_email: userEmail })
    .then(function(data) {
      response = $.parseJSON(data);
      if (response.errors) {
        log(response.errors[0]);
      } else {
        log('');
        $('#user_email').val('');
      }
    });
  });
  
  // POST feedback
  $('#feedbackPost').click(function() {
    var msg = "Feedback\n\n";
    msg += "User agent: " + navigator.userAgent + "\n\n";
    
    $('.feedback select').each(function() {
      if ($(this).find('option:selected').index() > 1) {
        msg += $(this).find('option').eq(0).text() + ": \n";
        msg += $(this).find('option:selected').text() + "\n\n";
      }
    });
    
    if ($('.thoughts').val().length > 0) {
      msg += "Thoughts: " + $('.thoughts').val() + "\n\n";
    }
    
    msg += "Current page: " + $('.box-1 .page').attr('id');
    
    $.post('/emails/feedback', { msg: msg })
    .then(function(data) {
      response = $.parseJSON(data);
      console.log(response.msg);
    });
  });
    
  // Camera logic
  $('#takePictureField').on("touchstart click", function() {
    $('#choosePhoto')
      .html('<i class="icon-sync animated infinite "></i>')
      .addClass('loading');
  });
  
  $('#takePictureField').change(function(e) {
    
    var file = e.target.files[0];
    
    var reader = new FileReader();
  
    reader.onload = function(event) {
      var filename = file.name;
      var data = event.target.result;
    
      $.ajax({url: "/roofs/" + $('body').data('roof-id') + "/photo",
        type: 'POST',
        data: { filename: filename, data: data },
        success: function(data, status, xhr) { console.log("Image posted.") }
      });
    
      $('#choosePhoto').click();
    
    };
    
    reader.readAsDataURL(file);
  });
    
  // Page logic
  var userClick = false;
  var fresh = true;
  var default_page_id = "page_index";
  var num_pages = $('.pages .page').length;

  var box1 = $('.box-1');
  var box2 = $('.box-2');

  FastClick.attach(document.body);

  document.ontouchmove = function(event){
    event.preventDefault();
  }

  if (window.navigator.standalone) {
    $('.arrow').hide();
  }

  pagesInit();
  $(window).resize(pagesInit);

  function pagesInit() {
    $('body').append('<div id="log"></div>');
  
    var height = $(window).height();
    var width = $(window).width();
    
    if(height < width){
      $('.feedback').show();
      $('body').css('overflow', 'visible');
    } else {
      $('.feedback').hide();
      $('body').css('overflow', 'hidden');
    }

    $('body').css('height', height + "px");

    $('.box').each(function(i) {  
      $(this).css({ 
        height: height + "px",
        width: width + "px",
        'z-index': "-" + i
      });
    });

    $('.expand').each(function(i) {
      $(this).css({
        height: height + "px",
        width: width + "px"
      });
    });
  
    $('.content').css("height", (height-100) +"px");
    $('.beta .content').css('height', height-40 + 'px');
  
    $('.next').click(function() {
      $(this).closest(".page-slides").css("left", "-=" + width + "px");
      $('.cloud').css("left", "-=" + (width*0.2) + "px");
      $('.city').css("left", "-=" + (width*0.1) + "px");
    });
  
    var clouds = [
      {x:35, y:70, depth:2},
      {x:300, y:50, depth:1},
      {x:240, y:50, depth:3},
      {x:25, y:190, depth:3},
      {x:290, y:140, depth:3}
    ];

    $.each(clouds,function(i, cloud) {
      $('<div />').addClass('cloud')
        .css({ 
          left: cloud.x,
          top: cloud.y,
          width: (50*(cloud.depth*0.5)) + "px",
          height:  (50*(cloud.depth*0.5)) + "px"
        })
        .data('depth', cloud.depth)
        .appendTo('.page-slides-mask');
    });
  }

  var History = window.History;

  if (History.enabled) {
  
    State = History.getState();
    // set initial state to first page that was loaded
    History.pushState({page_id: idFromPath(window.location.pathname)}, $("title").text(), State.urlPath);
    changePage(State);
  
  } else {
    return false;
  }

  // Bind to StateChange Event
  History.Adapter.bind(window, 'statechange', function() {
    changePage(History.getState());
    userClick = false;
  });

  $('body').on('click', '.nav', function() {
    userNavigates($(this));
  });

  function changePage(state) {
    console.log("Changing page...");
  
    // First page, only fires once
    if (fresh == true) {

      fresh = false;
    
      var page_id = state.data.page_id;
    
      if (page_id === undefined) {
        page_id = default_page_id;
      }
    
      var page = $('#' + page_id);
      var page_next = $('#' + page.attr("data-next"));


      box1.append(page);
      box2.append(page_next);
    
      $('.box .page').css('display', 'block');
    
      return;
    }
  
    if (userClick == false) {
    
      $('.pages')
        .append($('.box .page').hide());
    
      var page = $('#' + state.data.page_id);
      var page_next = $('#' + page.attr("data-next"));

      box1.append(page);
      box2.append(page_next);
    
      $('.box .page').show();
    
      return;
    }
  
    var page = box1.find('.page');
    var page_next = $('#' + page.attr("data-next"));
    var page_after = $('#' + page_next.attr("data-next"));
  
    box2.append(page_next);
  
    $('.box .page').show();
  
    box1.addClass('zoomOutSlideLeft');
    box2.addClass('slideLeftZoomIn');
  
    box2.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
    
      console.log("Finished animating.");
    
      box1
        .append(page_next)
        .removeClass('zoomOutSlideLeft');
      
      box2
        .html(page_after)
        .removeClass('slideLeftZoomIn');
      
      $('.pages').append(page.hide());
    
      $('.box .page').show();
    
    });
  
  }

  function userNavigates(el) {
    var page = el.closest('.page');
    var next_page_id = page.attr("data-next");
    userClick = true;
    History.pushState({ page_id: next_page_id }, $('title').text(), pathFromId(next_page_id));
  }

  function idFromPath(path) {
    if (path != "/") {
      return path.replace("/p/", "page_");
    } else {
      return default_page_id;
    }
  }

  function pathFromId(id) {
    return "/p/" + id.replace("page_", "");
  }

  function divert(page_id) {
    $('.pages').append(box2.find('.page').hide());
    box2.append($('#' + page_id).show());
    box1.find('.page').attr('data-next', page_id);
  }

});

function log(msg) {
  $('#log').text(msg);
}