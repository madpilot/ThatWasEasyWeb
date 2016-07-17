(function() {
  // Constants
  // Minify will turn these in to short variables
  var FETCH_APS = 1;
  var FETCHING_APS = 2;
  var FETCHED_APS = 3;
  var CHANGE_AP = 4;
  var CHANGE_PASSKEY = 5;
  var CHANGE_DEVICE_NAME = 6;
  var CHANGE_WEBHOOK = 7;
  var NOT_SCANNED = 8;
  var SCANNING = 9;
  var SCANNING_COMPLETE = 10;
  var SAVING = 11;
  var CONNECTED = 12;
  var CONNECTION_ERROR = 13;
  var FETCHING_CONFIG = 14;
  var FETCHED_CONFIG = 15;
  var NOT_CONFIGURED = 16;
  var SAVED = 17;

  // Initial State
  var state = {
    ui: {
      passkey: {
        changed: false,
        valid: false,
        error: null,
        value: ''
      },
      deviceName: {
        changed: false,
        valid: false,
        error: null,
        value: ''
      },
      webhook: {
        changed: false,
        valid: false,
        error: null,
        value: ''
      }
    },
    aps: [],
    ap: null,
    apConfigured: true,
    error: '',
    connection: NOT_CONFIGURED
  };

  function assign() {
    return Object.assign.apply(this, arguments);
  }

  function ajax(url, method, data, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if(xhr.status == 200) {
          success(xhr.responseText);
        } else if(xhr.status == 422) {
          error(xhr.responseText);
        }
      }
    }

    if(data) {
      xhr.send(data);
    } else {
      xhr.send();
    }
  }

  // Reducers
  function reduce_ap(state, action) {
    switch(action.type) {
    case SCANNING_COMPLETE:
      if(action.aps.length == 0) {
        return null;
      } else {
        return assign({}, action.aps[0]);
      }

    case CHANGE_AP:
      return assign({}, action.ap);
    }

    return state;
  }

  function reduce_apConfigured(state, action) {
    if(action.type == SCANNING) {
      return false;
    }
    return state;
  }

  function reduce_ui_passkey(state, action) {
    if(action.type == CHANGE_PASSKEY) {
      var valid = action.value.length > 0 && action.value.length <= 32;

      return assign({}, state, {
        value: action.value,
        valid: valid,
        changed: true
      });
    }

    return state;
  }

  function reduce_ui_deviceName(state, action) {
    if(action.type == CHANGE_DEVICE_NAME) {
      var value = action.value;
      var valid = value.length > 0 && value.length <= 64;

      return assign({}, state, {
        value: action.value,
        valid: valid,
        changed: true
      });
    } else if(action.type == FETCHED_CONFIG) {
      var value = action.config.deviceName;
      var valid = value.length > 0 && value.length <= 64;

      return assign({}, state, {
        value: value,
        valid: valid,
        changed: value != ""
      });
    }

    return state;
  }

  function reduce_ui_webhook(state, action) {
    if(action.type == CHANGE_WEBHOOK) {
      var value = action.value;
      var valid = value.length > 0 && value.length <= 256;
      return assign({}, state, {
        value: action.value,
        valid: valid,
        changed: true
      });
    } else if(action.type == FETCHED_CONFIG) {
      var value = action.config.webhook;
      var valid = value.length > 0 && value.length <= 256;
      return assign({}, state, {
        value: action.config.webhook,
        valid: valid,
        changed: value != ""
      });
    }

    return state;
  }

  function reduce_error(state, action) {
    if(action.type == CONNECTION_ERROR) {
      return action.message
    }

    return state;
  }

  function reduce_aps(state, action) {
    if(action.type == SCANNING_COMPLETE) {
      return action.aps;
    }

    return state;
  }

  function reduce_connection(state, action) {
    // Since these types are literally used as state flags,
    // we can just return the type
    switch(action.type) {
    case FETCHED_CONFIG:
    case SAVING:
    case SCANNING:
    case SCANNING_COMPLETE:
    case CONNECTED:
    case CONNECTION_ERROR:
      return action.type;
    default:
      return state;
    }
  }

  function dispatch(action) {
    var oldState = assign({}, state);
    state = assign({}, oldState);
    var ui = assign({}, state.ui)

    ui.passkey = reduce_ui_passkey(ui.passkey, action);
    ui.deviceName = reduce_ui_deviceName(ui.deviceName, action);
    ui.webhook = reduce_ui_webhook(ui.webhook, action);

    state.error = reduce_error(state.error, action);
    state.ap = reduce_ap(state.ap, action);
    state.apConfigured = reduce_apConfigured(state.apConfigured, action);
    state.aps = reduce_aps(state.aps, action);
    state.connection = reduce_connection(state.connection, action);
    state.ui = ui;

    render(state, oldState);
  }

  function getElementById(id) {
    return document.getElementById(id);
  }

  function addClass(el, className) {
    if(el.className.indexOf(className) === -1) {
      var a = el.className.split(' ');
      a.push(className);
      el.className = a.join(' ');
    }
  }

  function removeClass(el, className) {
    var a = el.className.split(' ');
    var index = a.indexOf(className);

    if(index !== -1) {
      a.splice(index, 1)
      el.className = a.join(' ');
    }
  }

  var DISABLED = 'disabled';
  var HIDDEN = 'hidden';
  function enable(el) {
    el.removeAttribute(DISABLED);
  }

  function disable(el) {
    el.setAttribute(DISABLED, DISABLED);
  }

  function show(el) {
    removeClass(el, HIDDEN);
  }

  function hide(el) {
    addClass(el, HIDDEN);
  }

  function innerHTML(el, text) {
    el.innerHTML = text;
  }

  function render_inputs_enabled(state, old) {
    if(state.connection === old.connection) return;

    var ssid = getElementById('ssid');
    var passkey = getElementById('passkey');
    var deviceName = getElementById('deviceName');
    var webhook = getElementById('webhook');

    switch(state.connection) {
      case NOT_CONFIGURED:
      case NOT_SCANNED:
      case SCANNING:
        disable(ssid);
        disable(passkey);
        disable(deviceName);
        disable(webhook);
        break;
      default:
        enable(ssid);
        enable(passkey);
        enable(deviceName);
        enable(webhook);
    }
  }

  function render_ssid_visible(state, old) {
    if(state.apConfigured === old.apConfigured) return;
    var el = getElementById('ssid-wrapper');

    if(state.apConfigured) {
      hide(el);
    } else {
      show(el);
    }
  }

  function render_ssid_aps(state, old) {
    if(state.connection === old.connection && state.aps === old.aps && state.ap === old.ap) return;

    var ssid = getElementById('ssid');
    var aps = state.aps;
    var connection = state.connection;
    var selected = state.ap;

    if(connection === SCANNING) {
      innerHTML(ssid, '<option>Scanning...</option>');
    } else if(connection === NOT_CONFIGURED || connection === NOT_SCANNED  || aps.length == 0) {
      innerHTML(ssid, '');
    } else {
      var html = [];
      for(var i = 0; i < aps.length; i++) {
        var ap = aps[i];
        html.push("<option value=\"" + ap.ssid + "\"" + (selected.ssid == ap.ssid ? " selected" : "") + ">" + ap.ssid + "</option>");
      }
      innerHTML(ssid, html.join(''));
    }
  }

  function render_value(state, old, key) {
    if(state.ui[key].value === old.ui[key].value) return;

    var el = getElementById(key);

    if(el.value != state.ui[key].value) {
      el.value = state.ui[key].value;
    }
  }

  function render_passkey_value(state, old) {
    render_value(state, old, 'passkey');
  }

  function render_deviceName_value(state, old) {
    render_value(state, old, 'deviceName');
  }

  function render_webhook_value(state, old) {
    render_value(state, old, 'webhook');
  }

  function render_passkey_visible(state, old) {
    var encrypted = state.ap ? state.ap.encryption : null;
    var oldEncrypted = old.ap ? old.ap.encryption : null;

    var same = state.ui.passkey.value === old.ui.passkey.value;
    same = same && encrypted === oldEncrypted;

    if(same) return;

    var passkey = getElementById('passkey-wrapper');

    if(encrypted == 7) {
      hide(passkey);
    } else {
      show(passkey);
    }
  }

  function render_passkey_error(state, old) {
    var same = state.ui.passkey.changed === old.ui.passkey.changed;
    same = same && state.ui.passkey.valid === old.ui.passkey.valid;
    same = same && state.ui.passkey.value === old.ui.passkey.value;

    if(same) return;
    var value = state.ui.passkey.value;

    var passkeyError = getElementById('passkey-error');
    if(state.ui.passkey.changed && !state.ui.passkey.valid) {
      if(value.length == 0) {
        innerHTML(passkeyError, 'is required');
      } else if(value.length >= 32) {
        innerHTML(passkeyError, 'is too long');
      }
      show(passkeyError);
    } else {
      hide(passkeyError);
    }
  }

  function render_deviceName_error(state, old) {
    var same = state.ui.deviceName.changed === old.ui.deviceName.changed;
    same = same && state.ui.deviceName.valid === old.ui.deviceName.valid;
    same = same && state.ui.deviceName.value === old.ui.deviceName.value;

    if(same) return;
    var value = state.ui.deviceName.value;

    var deviceNameError = getElementById('deviceName-error');
    if(state.ui.deviceName.changed && !state.ui.deviceName.valid) {
      if(value.length == 0) {
        innerHTML(deviceNameError, 'is required');
      } else if(value.length >= 64) {
        innerHTML(deviceNameError, 'is too long');
      }
      show(deviceNameError);
    } else {
      hide(deviceNameError);
    }
  }

  function render_webhook_error(state, old) {
    var same = state.ui.webhook.changed === old.ui.webhook.changed;
    same = same && state.ui.webhook.valid === old.ui.webhook.valid;
    same = same && state.ui.webhook.value === old.ui.webhook.value;

    if(same) return;
    var value = state.ui.webhook.value;

    var webhookError = getElementById('webhook-error');
    if(state.ui.webhook.changed && !state.ui.webhook.valid) {
      if(value.length == 0) {
        innerHTML(webhookError, 'is required');
      } else if(value.length >= 256) {
        innerHTML(webhookError, 'is too long');
      }
      show(webhookError);
    } else {
      hide(webhookError);
    }
  }

  function render_button_disabled(state, old) {
    var encryption = state.ap ? state.ap.encryption : null;
    var oldEncryption = old.ap ? old.ap.encryption: null;

    var same = state.ui.passkey.valid === old.ui.passkey.valid;
    same = same && state.ui.deviceName.valid === old.ui.deviceName.valid;
    same = same && state.ui.webhook.valid === old.ui.webhook.valid;
    same = same && state.connection === old.connection;
    same = same && encryption === oldEncryption;

    if(same) return;

    var button = getElementById('button');
    var enabled = state.ui.deviceName.valid && state.ui.webhook.valid;
    if(!state.apConfigured) {
      enabled = enabled && (state.connection === SCANNING_COMPLETE && (encryption === 7 || state.ui.passkey.valid));
    }

    if(state.connection === SAVING) {
      enabled = false;
    }

    if(enabled) {
      enable(button);
    } else {
      disable(button);
    }
  }

  function render_button_value(state, old) {
    if(state.connection === old.connection) return;

    var button = getElementById('button');
    if(state.connection === SAVING) {
      removeClass(button, "success");
      innerHTML(button, "Saving...");
    } else if(state.apConfigured && state.connection === CONNECTED) {
      addClass(button, "success");
      innerHTML(button, "Saved!");
    } else {
      removeClass(button, "success");
      innerHTML(button, "Save");
    }
  }

  function render_form_visible(state, old) {
    if(state.connection === old.connection) return;

    var form = getElementById('form');
    if(!state.apConfigured && state.connection === CONNECTED) {
      hide(form);
    } else {
      show(form);
    }
  }

  function render_notification(state, old) {
    if(state.connection === old.connection) return;

    var notification = getElementById('notification');

    if(!state.apConfigured && state.connection === CONNECTED) {
      var link = getElementById('device-name-link');
      link.innerHTML = link.href = "http://" + state.ui.deviceName.value + ".local";
      show(notification);
    } else {
      hide(notification);
    }
  }

  function render_error(state, old) {
    if(state.connection === old.connection) return;

    var error = getElementById('error');
    if(state.connection === CONNECTION_ERROR) {
      error.innerHTML = state.error;
      show(error);
    } else {
      hide(error);
    }
  }

  // Can a function for each element - if the returned dom representation is different
  // to the current dom representation, update the element
  function render(state, old) {
    render_inputs_enabled(state, old);
    render_ssid_visible(state, old);
    render_ssid_aps(state, old);
    render_passkey_value(state, old);
    render_deviceName_value(state, old);
    render_webhook_value(state, old);
    render_passkey_visible(state, old);
    render_passkey_error(state, old);
    render_deviceName_error(state, old);
    render_webhook_error(state, old);
    render_button_disabled(state, old);
    render_button_value(state, old);
    render_form_visible(state, old);
    render_notification(state, old);
    render_error(state, old);
  }

  function browse() {
    dispatch({ type: SCANNING });

    ajax("/browse.json", "GET", null, function(text) {
      dispatch({ type: SCANNING_COMPLETE, aps: JSON.parse(text) });
    });
  }

  function getConfig() {
    dispatch({ type: FETCHING_CONFIG });

    ajax("/config.json", "GET", null, function(text) {
      var json = JSON.parse(text);
      dispatch({ type: FETCHED_CONFIG, config: json });

      if(!json.apConfigured) {
        browse();
      }
    });
  }

  function changeAP(event) {
    event.preventDefault();

    var ap = null;
    var aps = state.aps;
    for(var i = 0; i < aps.length; i++) {
      if(aps[i].ssid == event.target.value) {
        ap = aps[i];
      }
    }

    dispatch({
      type: CHANGE_AP,
      ap: ap
    });
  }

  function changePasskey(event) {
    event.preventDefault();

    dispatch({
      type: CHANGE_PASSKEY,
      value: event.target.value
    });
  }

  function changeDeviceName(event) {
    event.preventDefault();

    dispatch({
      type: CHANGE_DEVICE_NAME,
      value: event.target.value
    });
  }

  function changeWebhook(event) {
    event.preventDefault();

    dispatch({
      type: CHANGE_WEBHOOK,
      value: event.target.value
    });
  }

  function onSave(event) {
    event.preventDefault();

    var deviceName = state.ui.deviceName.value;
    var webhook = state.ui.webhook.value;

    var data = {
      deviceName: deviceName,
      webhook: webhook
    }

    if(!state.apConfigured) {
      data.ssid = state.ap.ssid;

      if(state.ap.encryption != 7) {
        data.passkey = state.ui.passkey.value;
      }
    }

    dispatch({ type: SAVING });

    ajax("/save", "POST", JSON.stringify(data), function() {
      dispatch({ type: CONNECTED });

      if(state.apConfigured) {
        setTimeout(function() {
          dispatch({ type: FETCHED_CONFIG, config: data });
          if(window.location.hostname != state.ui.deviceName.value  + ".local") {
            window.location = "http://" + state.ui.deviceName.value + ".local";
          }
        }, 1000);
      }
    }, function(message) {
      dispatch({ type: CONNECTION_ERROR, message: message });
    });
  }

  getElementById('ssid').addEventListener('change', changeAP, true);
  getElementById('passkey').addEventListener('input', changePasskey, true);
  getElementById('deviceName').addEventListener('input', changeDeviceName, true);
  getElementById('webhook').addEventListener('input', changeWebhook, true);
  getElementById('form').addEventListener('submit', onSave, true);

  getConfig();
})();
