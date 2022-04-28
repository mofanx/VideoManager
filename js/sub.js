var g_sub = {

    init: function() {

    },
    modal_setJianyin_path: function() {
        prompt(g_config.jianyin || nodejs.env.LOCALAPPDATA + '\\JianyingPro\\User Data\\Projects\\com.lveditor.draft\\', {
            title: '请先设置剪映项目根目录',
            callback: path => {
                if (!nodejs.files.isDir(path)) {
                    toast('不是有效的目录', 'alert-danger');
                    return false;
                }
                g_config.jianyin = path;
                local_saveJson('config', g_config);
                toast('设置成功', 'alert-success');
            }
        });
    },
    modal: function(callback) {
        var path = g_config.jianyin || '';
        if (!nodejs.files.isDir(path)) {
            return this.modal_setJianyin_path();
        }
        var h = `
    <div class="input-group mb-3">
      <div class="input-group-prepend">
        <span class="input-group-text">搜索</span>
      </div>
      <input type="text" class="form-control" placeholder="搜索剪映项目" aria-label="" id="input_searchJianyin" >
       <div class="input-group-append">
        <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">...</button>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="javascript: g_sub.modal_setJianyin_path()">剪映目录</a>
        </div>
      </div>
    </div>

    <ul class="list-group" id="list_jianyin">`;
        for (var dir of files.listDir(path)) {
            h += `
                <li data-action="singleSelect,[data-jianyin],active" class="list-group-item d-flex justify-content-between align-items-center${g_cache.jianyin == dir ? ' active' : ''}"  data-jianyin="${dir}">
                    ${popString(dir, '\\')}
                  </li>
                `;
        }
        h += '</ul>';
        confirm(h, {
            title: '选择剪映项目',
            btns: [{
                id: 'ok',
                text: '确定',
                class: 'btn-primary',
            }, {
                id: 'refresh',
                text: '刷新',
                class: 'btn-info',
            }, {
                id: 'cancel',
                text: '取消',
                class: 'btn-secondary',
            }],
            callback: (id) => {
                if (id == 'refresh') return this.modal(callback);
                if (id == 'ok') {
                    var selected = $('[data-jianyin].active');
                    if (!selected.length) return false;
                    callback(selected.data('jianyin'));
                }
                return true;
            }
        });

        $('#input_searchJianyin').on('input', function(e) {
            var s = this.value;
            for (var item of $('#list_jianyin li')) {
                item.classList.toggle('hide', item.outerText.indexOf(s) == -1);
            }
            // var py = PinYinTranslate.start(s);
            // var sz = PinYinTranslate.sz(s);
            // for (var d of $('#modal_confirm .list-group-item')) {
            //     var t = d.dataset.tag;
            //     var b = t.indexOf(s) != -1 || PinYinTranslate.start(t).indexOf(py) != -1 || PinYinTranslate.sz(t).indexOf(sz) != -1;
            //     $(d).toggleClass('hide', !b);
            // }
        });
    },

    searchSub: function(s) {
        for (var item of $('#list_sub_item li')) {
            item.style.display = item.querySelector('span').outerText.indexOf(s) != -1 ? 'unset' : 'none';
        }
    },
    loadSub: function(key, cache = true) {
        var file = './subs/' + key + '.vtt';
        var subs;
        if (cache && nodejs.files.exists(file)) {
            // subs = PF_SRT.parse(nodejs.files.read(file));
            subs = _player.video.textTracks[0].cues;
        } else {
            subs = this.getSub(key);
        }
        var h = '';
        var i = 0;
        if (subs) {
            for (var sub of subs) {
                h += `<li class="list-group-item sub_item" data-action="sub_item" data-time="${sub.startTime}">
                        <b  style="user-select: none;margin-right: 10px;" >${sub.startTime}</b>
                        <span>${sub.text.trim()}</span>
                    </li>`;
                    i++;
            }
        }
        g_sub.lines = i;
        if (h == '') {
            h = `<li class="list-group-item">没有字幕</li>`;
        } else {
            $('[data-action="sub_saveSub"]').removeClass('hide');
        }
        $('#list_sub_item').html(h);
    },
    unlinkTarget: function() {
        clearInterval(this.timer);
    },
    timer: -1,
    setTarget: function(key, dir) {
        this.unlinkTarget();

        var self = this;
        this.dir = dir;
        this.file = dir + '\\draft_content.json';
        this.timer = setInterval(() => {
            var stat = nodejs.files.stat(this.file);
            if (self.mtime != stat.mtimeMs) {
                self.loadSub(key, false);
                self.mtime = stat.mtimeMs;
            }
        }, 1000);
    },
    saveSub: function() {
        var key = g_video.key;
        if (!key) return;
        if (!this.subs) return;
        var s = '';
        var i = 0;
        for (var sub of this.subs) {
            s += `${getTime(sub.startTime, ':', ':', '', false, 3)} --> ${getTime(sub.endTime, ':', ':', '',false, 3)}\r\n${sub.text}\r\n\r\n`;
            i++;
        }
        if (s == '') {
            toast('没有字幕内容', 'alert-danger');
        } else {
            nodejs.files.write('./subs/' + key + '.vtt', `WEBVTT`+'\r\n\r\n'+s);
            toast('保存成功', 'alert-success');
            $('[data-action="sub_saveSub"]').addClass('hide');
            this.unlinkTarget();
            g_video.loadVideo(g_video.key, g_player.getCurrentTime());
        }
    },
    getSub: function(key) {
        var file = this.file;
        var r = [];
        if (file) {
            if (!nodejs.files.exists(file)) return;
            try {
                var json = JSON.parse(nodejs.files.read(file));
                if (json.tracks[1]) {
                    var i = 0;
                    var max = json.tracks[1].segments.length;
                    for (var sub of json.materials.texts) {
                        if (i < max) {
                            var time = json.tracks[1].segments[i].target_timerange;
                            var start = Number(time.start * 1 / 1000000).toFixed(3);
                            var duration = Number(time.duration * 1 / 1000000).toFixed(3);
                            var end = (Number(start) + Number(duration)).toFixed(3);
                            r.push({
                                line: i,
                                startTime: start,
                                endTime: end,
                                text: sub.content,
                            })
                        }
                        i++

                    }
                }
            } catch (e) {
                console.error(e);
                toast('错误json', 'alert-danger');
            }
            this.subs = r;
            console.log(r);
        }
        return r;
    },

}
g_sub.init();