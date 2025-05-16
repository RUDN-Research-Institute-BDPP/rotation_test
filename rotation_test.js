// rotation_test.js
// Инициализация jsPsych и настройка экспорта в Excel
const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_finish: () => {
    // Сбор данных по image-button-response тряйлам
    const all_trials = jsPsych.data.get().filter({trial_type: 'image-button-response'}).values();
    // Подготовка основной таблицы
    const rows = all_trials.map((trial, idx) => {
      const filename = trial.filename;
      const matchFrag = filename.match(/^(\d+)_/);
      const matchAngle = filename.match(/_(\d+)(?:_R)?\.jpg$/);
      const fragCount = matchFrag ? getFragmentCount(parseInt(matchFrag[1])) : null;
      const angle = matchAngle ? parseInt(matchAngle[1]) : null;
      return {
        '№': idx + 1,
        'Файл': filename,
        'Фрагментов': fragCount,
        'Угол': angle,
        'Тип': filename.includes('_R') ? 'Разные' : 'Одинаковые',
        'RT (мс)': trial.rt,
        'Ответ': trial.response_label,
        'Правильно': trial.correct_trial ? '✔️' : '❌'

      };
    });
    // Генерация сводной статистики
    const stats = {};
    const total = rows.length;
    stats['Точность, %'] = percentCorrect(rows);
    stats['Точность одинаковых, %'] = percentCorrect(rows.filter(r => r['Тип'] === 'Одинаковые'));
    stats['Точность разных, %'] = percentCorrect(rows.filter(r => r['Тип'] === 'Разные'));
    // Трети
    const third = Math.floor(total/3);
    stats['Первая треть, %'] = percentCorrect(rows.slice(0, third));
    stats['Середина, %'] = percentCorrect(rows.slice(third, third*2));
    stats['Последняя треть, %'] = percentCorrect(rows.slice(third*2));
    // Средние RT
    stats['Среднее RT (мс)'] = avgRT(rows);
    stats['Среднее RT одинаковых'] = avgRT(rows.filter(r => r['Тип'] === 'Одинаковые'));
    stats['Среднее RT разных'] = avgRT(rows.filter(r => r['Тип'] === 'Разные'));
    stats['Среднее RT 1/3'] = avgRT(rows.slice(0, third));
    stats['Среднее RT 2/3'] = avgRT(rows.slice(third, third*2));
    stats['Среднее RT 3/3'] = avgRT(rows.slice(third*2));
    // Статистика по углам
    const angles = [0,50,100,150];
    angles.forEach(angle => {
      const subset = rows.filter(r => r['Угол'] === angle);
      stats[`Угол ${angle}: кол-во`] = subset.length;
      stats[`Угол ${angle}: точность, %`] = percentCorrect(subset);
      stats[`Угол ${angle}: RT`] = avgRT(subset);
    });
    // Выгрузка в Excel: создаём листы
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Данные');
    const statRows = Object.entries(stats).map(([k,v])=>({Показатель:k, Значение:v}));
    const ws2 = XLSX.utils.json_to_sheet(statRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Статистика');
    // Имя файла
    const now = new Date();
    const ts = now.toLocaleString('ru-RU').replace(/[\s:]/g,'_').replace(/[.,]/g,'-');
    const fname = `Результаты_${ts}.xlsx`;
    XLSX.writeFile(wb, fname);
    jsPsych.data.displayData();
  }
});

// Функции вспомогательные
function getFragmentCount(number) {
  if ([1,2,3].includes(number)) return 7;
  if ([4,5,6,7,8,9,13,14,15,25,26,27].includes(number)) return 8;
  if ([10,11,12,16,17,18,19,20,21,28,29,30,31,32,33,34,38,39,40].includes(number)) return 9;
  if ([22,23,24,35,36,37,41,42,43,44,45,46].includes(number)) return 10;
  if ([47,48].includes(number)) return 11;
  return null;
}

function percentCorrect(rows) {
  if (!rows.length) return 0;
  const correct = rows.filter(r=>r['Правильно']==='✔️').length;
  return Math.round((correct/rows.length)*100);
}

function avgRT(rows) {
  if (!rows.length) return 0;
  const sum = rows.reduce((acc,r)=>acc + (r['RT (мс)']||0), 0);
  return Math.round(sum/rows.length);
}

const angles = [0, 50, 100, 150];
const totalTrials = 36;
const trialsPerGroup = 12; // 36 / 3
const correctCount = 18;
const incorrectCount = 18;

// 1. Номера по количеству фрагментов
const fragmentGroups = {
  8: [4, 5, 6, 7, 8, 9, 13, 14, 15, 25, 26, 27],
  9: [10, 11, 12, 16, 17, 18, 19, 20, 21, 28, 29, 30, 31, 32, 33, 34, 38, 39, 40],
 10: [22, 23, 24, 35, 36, 37, 41, 42, 43, 44, 45, 46]
};

// 2. Выбираем 12 уникальных комбинаций (номер + угол) для каждой группы
function selectUniqueCombinations(groupNumbers, count) {
  const selected = [];
  while (selected.length < count) {
    const number = jsPsych.randomization.sampleWithReplacement(groupNumbers, 1)[0];
    const usedAngles = selected.filter(s => s.number === number).map(s => s.angle);
    const availableAngles = angles.filter(a => !usedAngles.includes(a));
    if (availableAngles.length === 0) continue;

    const angle = jsPsych.randomization.sampleWithoutReplacement(availableAngles, 1)[0];
    selected.push({ number, angle });
  }
  return selected;
}

// 3. Собираем 36 уникальных комбинаций (12 из каждой группы)
let combinations = [];
combinations = combinations.concat(selectUniqueCombinations(fragmentGroups[8], trialsPerGroup));
combinations = combinations.concat(selectUniqueCombinations(fragmentGroups[9], trialsPerGroup));
combinations = combinations.concat(selectUniqueCombinations(fragmentGroups[10], trialsPerGroup));

// 4. Назначаем половине из них правильный, половине — "_R"
let labeled = combinations.map(c => ({ ...c, correct: true }));
labeled = jsPsych.randomization.shuffle(labeled);
labeled = labeled.map((c, i) => {
  if (i >= correctCount) c.correct = false;
  return c;
});

// 🔄 Перемешиваем ещё раз после назначения correct
labeled = jsPsych.randomization.shuffle(labeled);


// 5. Формируем финальные имена файлов
const selected = labeled.map(c => {
  const suffix = c.correct ? '.jpg' : '_R.jpg';
  return `${c.number}_${c.angle}${suffix}`;
});



// Шаг 5. Перемешиваем
const shuffled = jsPsych.randomization.shuffle(selected);



// 3) Предварительная загрузка всех выбранных изображений
const preload = {
  type: jsPsychPreload,
  images: shuffled.map(fn => `Rotation_pictures/${fn}`)
};


// 4) Инструкция перед началом
const instructions = {
  type: jsPsychInstructions,
  pages: [
    `<p>Вам будет показано 30 изображений с двумя объектами.</p>
     <p>Нажимайте <strong>"Одинаковые"</strong>, если на картинке — два одинаковых объекта,  
     или <strong>"Разные"</strong>, если объекты отличаются.</p>
     <p>Нажмите «Далее», чтобы начать.</p>`
  ],
  show_clickable_nav: true,
  button_label_next: 'Далее',
  allow_backward: false
};

// 5) Создаём_trials для каждого изображения
const image_trials = shuffled.map(filename => {
  const correct = filename.endsWith('_R.jpg') ? 'Разные' : 'Одинаковые';
  return {
    type: jsPsychImageButtonResponse,
    stimulus: `Rotation_pictures/${filename}`,
    choices: ['Одинаковые', 'Разные'],
    prompt: "<p>Выберите, одинаковые ли объекты на изображении</p>",
    button_html: (choice) => {
      const bg = choice === 'Одинаковые' ? '#4CAF50' : '#F44336'; 
      return `<button class="jspsych-btn" style="background-color: ${bg}; color: white; margin: 10px; padding: 10px 20px;">${choice}</button>`;
    },
    data: {
      filename: filename,
      correct: correct
    },
    on_finish: function(data) {
      const trial = jsPsych.getCurrentTrial();
      const choices = trial?.choices ?? [];
      if (data.response !== null && data.response !== undefined && data.response >= 0 && data.response < choices.length) {
        data.response_label = choices[data.response];
        data.correct_trial = (data.response_label === data.correct);
      } else {
        data.response_label = null;
        data.correct_trial = false;
      }
    }
  };
});




// 6) Блок с обратной связью по каждому ответу (необязательно)
// Можно удалить, если не нужен.
const feedback = {
  type: jsPsychHtmlButtonResponse,
  choices: ['Далее'],
  stimulus: function(){
    const last = jsPsych.data.get().last(1).values()[0];
    return last.correct_trial
      ? '<p style="color:green">Правильно!</p>'
      : `<p style="color:red">Неправильно. Правильный ответ: ${last.correct}</p>`;
  }
};

// 7) Финальный экран с результатами
const debrief = {
  type: jsPsychHtmlButtonResponse,
  choices: ['Завершить'],
  stimulus: function() {
    const all = jsPsych.data.get().filter({ trial_type: 'image-button-response' });
    const n_correct = all.filter({ correct_trial: true }).count();
    const n_total = all.count();
    return `<h2>Ваш результат:</h2>
            <p>Правильных ответов: ${n_correct} из ${n_total}</p>
            <p>Процент: ${Math.round((n_correct/n_total)*100)}%</p>`
  }
};

// 8) Собираем таймлайн
const timeline = [preload, instructions];
shuffled.forEach((_, i) => {
  timeline.push(image_trials[i]);
  // если хотите показывать feedback — раскомментируйте:
  // timeline.push(feedback);
});
timeline.push(debrief);

// 9) Запуск
jsPsych.run(timeline);
