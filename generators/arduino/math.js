/**
 * @license Licensed under the Apache License, Version 2.0 (the "License"):
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 * @fileoverview Generating Arduino code for the math blocks.
 */
'use strict';

goog.provide('Blockly.Arduino.math');

goog.require('Blockly.Arduino');


/**
 * Generator for a numeric value
 * Arduino code: loop { X }
 */
Blockly.Arduino['math_number'] = function(block) {
  // Numeric value.
  var code = parseFloat(block.getFieldValue('NUM'));
  return [code, Blockly.Arduino.ORDER_ATOMIC];
};

/**
 * Generator for a basic arithmetic operators and power function.
 * Arduino code: loop { X operator Y }
 */
Blockly.Arduino['math_arithmetic'] = function(block) {
  var OPERATORS = {
    ADD: [' + ', Blockly.Arduino.ORDER_ADDITIVE],
    MINUS: [' - ', Blockly.Arduino.ORDER_ADDITIVE],
    MULTIPLY: [' * ', Blockly.Arduino.ORDER_MULTIPLICATIVE],
    DIVIDE: [' / ', Blockly.Arduino.ORDER_MULTIPLICATIVE],
    POWER: [null, Blockly.Arduino.ORDER_NONE]  // Handle power separately.
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.Arduino.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.Arduino.valueToCode(block, 'B', order) || '0';
  var code;
  // Power in C++ requires a special case since it has no operator.
  if (!operator) {
    code = 'Math.pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.Arduino.ORDER_UNARY_POSTFIX];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

/**
 * Generator for math operators that contain a single operand.
 * Arduino code: loop { operator(X) }
 */
Blockly.Arduino['math_single'] = function(block) {
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedents.
    arg = Blockly.Arduino.valueToCode(block, 'NUM',
        Blockly.Arduino.ORDER_UNARY_PREFIX) || '0';
    if (arg[0] == '-') {
      // --3 is not legal in C++ in this context.
      arg = ' ' + arg;
    }
    code = '-' + arg;
    return [code, Blockly.Arduino.ORDER_UNARY_PREFIX];
  }
  if (operator == 'ABS' || operator.substring(0, 5) == 'ROUND') {
    arg = Blockly.Arduino.valueToCode(block, 'NUM',
        Blockly.Arduino.ORDER_UNARY_POSTFIX) || '0';
  } else if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = Blockly.Arduino.valueToCode(block, 'NUM',
        Blockly.Arduino.ORDER_MULTIPLICATIVE) || '0';
  } else {
    arg = Blockly.Arduino.valueToCode(block, 'NUM',
        Blockly.Arduino.ORDER_NONE) || '0';
  }
  // First, handle cases which generate values that don't need parentheses.
  switch (operator) {
    case 'ABS':
      code = 'abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'log(' + arg + ')';
      break;
    case 'EXP':
      code = 'exp(' + arg + ')';
      break;
    case 'POW10':
      code = 'pow(10,' + arg + ')';
      break;
    case 'ROUND':
      code = 'round(' + arg + ')';
      break;
    case 'ROUNDUP':
      code = 'ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'sin(' + arg + ' / 180 * Math.PI)';
      break;
    case 'COS':
      code = 'cos(' + arg + ' / 180 * Math.PI)';
      break;
    case 'TAN':
      code = 'tan(' + arg + ' / 180 * Math.PI)';
      break;
  }
  if (code) {
    return [code, Blockly.Arduino.ORDER_UNARY_POSTFIX];
  }
  // Second, handle cases which generate values that may need parentheses.
  switch (operator) {
    case 'LOG10':
      code = 'log(' + arg + ') / log(10)';
      break;
    case 'ASIN':
      code = 'asin(' + arg + ') / M_PI * 180';
      break;
    case 'ACOS':
      code = 'acos(' + arg + ') / M_PI * 180';
      break;
    case 'ATAN':
      code = 'atan(' + arg + ') / M_PI * 180';
      break;
    default:
      throw 'Unknown math operator: ' + operator;
  }
  return [code, Blockly.Arduino.ORDER_MULTIPLICATIVE];
};

/**
 * Generator for math constants (PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2),
 * INFINITY)
 * Arduino code: loop { constant }
 * TODO: Might need to include "#define _USE_MATH_DEFINES"
 *       The arduino header file already includes math.h
 */
Blockly.Arduino['math_constant'] = function(block) {
  var CONSTANTS = {
    'PI': ['M_PI', Blockly.Arduino.ORDER_UNARY_POSTFIX],
    'E': ['M_E', Blockly.Arduino.ORDER_UNARY_POSTFIX],
    'GOLDEN_RATIO': ['(1 + sqrt(5)) / 2', Blockly.Arduino.ORDER_MULTIPLICATIVE],
    'SQRT2': ['M_SQRT2', Blockly.Arduino.ORDER_UNARY_POSTFIX],
    'SQRT1_2': ['M_SQRT1_2', Blockly.Arduino.ORDER_UNARY_POSTFIX],
    'INFINITY': ['INFINITY', Blockly.Arduino.ORDER_ATOMIC]
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

/**
 * Generator for math checks: if a number is even, odd, prime, whole, positive,
 * negative, or if it is divisible by certain number. Returns true or false.
 * Arduino code: complex code, can create external functions.
 */
Blockly.Arduino['math_number_property'] = function(block) {
  // 
  var number_to_check = Blockly.Arduino.valueToCode(block, 'NUMBER_TO_CHECK',
      Blockly.Arduino.ORDER_MULTIPLICATIVE) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    //FIXME: this doesn't work yet
    // Prime is a special case as it is not a one-liner test.
    var functionName = Blockly.Arduino.provideFunction_(
        'math_isPrime',
        [ 'function ' + Blockly.Arduino.FUNCTION_NAME_PLACEHOLDER_ + '(n) {',
          '  // https://en.wikipedia.org/wiki/Primality_test#Naive_methods',
          '  if (n == 2 || n == 3) {',
          '    return true;',
          '  }',
          '  // False if n is NaN, negative, is 1, or not whole.',
          '  // And false if n is divisible by 2 or 3.',
          '  if (isnan(n) || (n <= 1) || (n % 1 != 0) || (n % 2 == 0) ||' +
            ' (n % 3 == 0)) {',
          '    return false;',
          '  }',
          '  // Check all the numbers of form 6k +/- 1, up to sqrt(n).',
          '  for (int x = 6; x <= sqrt(n) + 1; x += 6) {',
          '    if (n % (x - 1) == 0 || n % (x + 1) == 0) {',
          '      return false;',
          '    }',
          '  }',
          '  return true;',
          '}']);
    code = functionName + '(' + number_to_check + ')';
    return [code, Blockly.Arduino.ORDER_FUNCTION_CALL];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' % 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' % 2 == 1';
      break;
    case 'WHOLE':
      code = number_to_check + ' % 1 == 0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = Blockly.Arduino.valueToCode(block, 'DIVISOR',
          Blockly.Arduino.ORDER_MULTIPLICATIVE) || '0';
      code = number_to_check + ' % ' + divisor + ' == 0';
      break;
  }
  return [code, Blockly.Arduino.ORDER_EQUALITY];
};

/**
 * Generator to add to a variable.
 * Arduino code: loop { xX += Y; }
 * TODO: Might need to include "#define _USE_MATH_DEFINES"
 *       The arduino header file already includes math.h
 */
Blockly.Arduino['math_change'] = function(block) {
  var argument0 = Blockly.Arduino.valueToCode(block, 'DELTA',
      Blockly.Arduino.ORDER_ADDITIVE) || '0';
  var varName = Blockly.Arduino.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' += ' + argument0 + ';\n';
};

/**
 * Rounding functions have a single operand.
 */
Blockly.Arduino['math_round'] = Blockly.Arduino['math_single'];

/**
 * Trigonometry functions have a single operand.
 */
Blockly.Arduino['math_trig'] = Blockly.Arduino['math_single'];

/**
 * Generator for the math function to a list
 * Arduino code: ???
 * TODO: List have to be implemented first. Removed from toolbox for now.
 */
Blockly.Arduino['math_on_list'] = function(block) {
  var func = block.getFieldValue('OP');
  var list = Blockly.Arduino.valueToCode(block, 'LIST',
      Blockly.Arduino.ORDER_NONE) || '[]';
  var code;
  switch (func) {
    case 'SUM':
      if (!Blockly.Arduino.definitions_['math_sum']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_sum', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_sum = functionName;
        var func = [];
        func.push('num ' + functionName + '(List myList) {');
        func.push('  num sumVal = 0;');
        func.push('  myList.forEach((num entry) {sumVal += entry;});');
        func.push('  return sumVal;');
        func.push('}');
        Blockly.Arduino.definitions_['math_sum'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_sum + '(' + list + ')';
      break;
    case 'MIN':
      if (!Blockly.Arduino.definitions_['math_min']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_min', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_min = functionName;
        var func = [];
        func.push('num ' + functionName + '(List myList) {');
        func.push('  if (myList.isEmpty()) return null;');
        func.push('  num minVal = myList[0];');
        func.push('  myList.forEach((num entry) ' +
                  '{minVal = Math.min(minVal, entry);});');
        func.push('  return minVal;');
        func.push('}');
        Blockly.Arduino.definitions_['math_min'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_min + '(' + list + ')';
      break;
    case 'MAX':
      if (!Blockly.Arduino.definitions_['math_max']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_max', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_max = functionName;
        var func = [];
        func.push('num ' + functionName + '(List myList) {');
        func.push('  if (myList.isEmpty()) return null;');
        func.push('  num maxVal = myList[0];');
        func.push('  myList.forEach((num entry) ' +
                  '{maxVal = Math.max(maxVal, entry);});');
        func.push('  return maxVal;');
        func.push('}');
        Blockly.Arduino.definitions_['math_max'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_max + '(' + list + ')';
      break;
    case 'AVERAGE':
      // This operation exclude null and values that are not int or float:
      //   math_mean([null,null,"aString",1,9]) == 5.0.
      if (!Blockly.Arduino.definitions_['math_average']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_average', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_average = functionName;
        var func = [];
        func.push('num ' + functionName + '(List myList) {');
        func.push('  // First filter list for numbers only.');
        func.push('  List localList = myList.filter((a) => a is num);');
        func.push('  if (localList.isEmpty()) return null;');
        func.push('  num sumVal = 0;');
        func.push('  localList.forEach((num entry) {sumVal += entry;});');
        func.push('  return sumVal / localList.length;');
        func.push('}');
        Blockly.Arduino.definitions_['math_average'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_average + '(' + list + ')';
      break;
    case 'MEDIAN':
      if (!Blockly.Arduino.definitions_['math_median']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_median', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_median = functionName;
        var func = [];
        func.push('num ' + functionName + '(List myList) {');
        func.push('  // First filter list for numbers only, then sort, ' +
                  'then return middle value');
        func.push('  // or the average of two middle values if list has an ' +
                  'even number of elements.');
        func.push('  List localList = myList.filter((a) => a is num);');
        func.push('  if (localList.isEmpty()) return null;');
        func.push('  localList.sort((a, b) => (a - b));');
        func.push('  int index = (localList.length / 2).toInt();');
        func.push('  if (localList.length % 2 == 1) {');
        func.push('    return localList[index];');
        func.push('  } else {');
        func.push('    return (localList[index - 1] + localList[index]) / 2;');
        func.push('  }');
        func.push('}');
        Blockly.Arduino.definitions_['math_median'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_median + '(' + list + ')';
      break;
    case 'MODE':
      if (!Blockly.Arduino.definitions_['math_modes']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_modes', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_modes = functionName;
        // As a list of numbers can contain more than one mode,
        // the returned result is provided as an array.
        // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
        var func = [];
        func.push('List ' + functionName + '(values) {');
        func.push('  List modes = [];');
        func.push('  List counts = [];');
        func.push('  int maxCount = 0;');
        func.push('  for (int i = 0; i < values.length; i++) {');
        func.push('    var value = values[i];');
        func.push('    bool found = false;');
        func.push('    int thisCount;');
        func.push('    for (int j = 0; j < counts.length; j++) {');
        func.push('      if (counts[j][0] === value) {');
        func.push('        thisCount = ++counts[j][1];');
        func.push('        found = true;');
        func.push('        break;');
        func.push('      }');
        func.push('    }');
        func.push('    if (!found) {');
        func.push('      counts.add([value, 1]);');
        func.push('      thisCount = 1;');
        func.push('    }');
        func.push('    maxCount = Math.max(thisCount, maxCount);');
        func.push('  }');
        func.push('  for (int j = 0; j < counts.length; j++) {');
        func.push('    if (counts[j][1] == maxCount) {');
        func.push('        modes.add(counts[j][0]);');
        func.push('    }');
        func.push('  }');
        func.push('  return modes;');
        func.push('}');
        Blockly.Arduino.definitions_['math_modes'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_modes + '(' + list + ')';
      break;
    case 'STD_DEV':
      if (!Blockly.Arduino.definitions_['math_standard_deviation']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_standard_deviation', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_standard_deviation = functionName;
        var func = [];
        func.push('num ' + functionName + '(myList) {');
        func.push('  // First filter list for numbers only.');
        func.push('  List numbers = myList.filter((a) => a is num);');
        func.push('  if (numbers.isEmpty()) return null;');
        func.push('  num n = numbers.length;');
        func.push('  num sum = 0;');
        func.push('  numbers.forEach((x) => sum += x);');
        func.push('  num mean = sum / n;');
        func.push('  num sumSquare = 0;');
        func.push('  numbers.forEach((x) => sumSquare += ' +
                  'Math.pow(x - mean, 2));');
        func.push('  return Math.sqrt(sumSquare / n);');
        func.push('}');
        Blockly.Arduino.definitions_['math_standard_deviation'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_standard_deviation +
          '(' + list + ')';
      break;
    case 'RANDOM':
      if (!Blockly.Arduino.definitions_['math_random_item']) {
        var functionName = Blockly.Arduino.variableDB_.getDistinctName(
            'math_random_item', Blockly.Generator.NAME_TYPE);
        Blockly.Arduino.math_on_list.math_random_item = functionName;
        var func = [];
        func.push('Dynamic ' + functionName + '(List myList) {');
        func.push('  int x = (Math.random() * myList.length).floor().toInt();');
        func.push('  return myList[x];');
        func.push('}');
        Blockly.Arduino.definitions_['math_random_item'] = func.join('\n');
      }
      code = Blockly.Arduino.math_on_list.math_random_item + '(' + list + ')';
      break;
    default:
      throw 'Unknown operator: ' + func;
  }
  return [code, Blockly.Arduino.ORDER_UNARY_POSTFIX];
};

/**
 * Generator for the math modulo function (calculates remainder).
 * Arduino code: loop { X % Y }
 */
Blockly.Arduino['math_modulo'] = function(block) {
  var argument0 = Blockly.Arduino.valueToCode(block, 'DIVIDEND',
      Blockly.Arduino.ORDER_MULTIPLICATIVE) || '0';
  var argument1 = Blockly.Arduino.valueToCode(block, 'DIVISOR',
      Blockly.Arduino.ORDER_MULTIPLICATIVE) || '0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.Arduino.ORDER_MULTIPLICATIVE];
};

/**
 * Generator for clipping a number(X) between two limits (Y and Z).
 * Arduino code: loop { (X < Y ? Y : ( X > Z ? Z : X)) }
 */
Blockly.Arduino['math_constrain'] = function(block) {
  // Constrain a number between two limits.
  var argument0 = Blockly.Arduino.valueToCode(block, 'VALUE',
      Blockly.Arduino.ORDER_NONE) || '0';
  var argument1 = Blockly.Arduino.valueToCode(block, 'LOW',
      Blockly.Arduino.ORDER_NONE) || '0';
  var argument2 = Blockly.Arduino.valueToCode(block, 'HIGH',
      Blockly.Arduino.ORDER_NONE) || '0';
  var code = '(' + argument0 + ' < ' + argument1 + ' ? ' + argument1 +
      ' : ( ' + argument0 + ' > ' + argument2 + ' ? ' + argument2 + ' : ' +
      argument0 + '))'
  return [code, Blockly.Arduino.ORDER_UNARY_POSTFIX];
};

/**
 * Generator for a random integer between two numbers (X and Y).
 * Arduino code: loop { math_random_int(X, Y); }
 *               and an aditional math_random_int function
 */
Blockly.Arduino['math_random_int'] = function(block) {
  //TODO: update this
  // Random integer between [X] and [Y].
  var argument0 = Blockly.Arduino.valueToCode(block, 'FROM',
      Blockly.Arduino.ORDER_NONE) || '0';
  var argument1 = Blockly.Arduino.valueToCode(block, 'TO',
      Blockly.Arduino.ORDER_NONE) || '0';
  if (!Blockly.Arduino.definitions_['math_random_int']) {
    var functionName = Blockly.Arduino.variableDB_.getDistinctName(
        'math_random_int', Blockly.Generator.NAME_TYPE);
    Blockly.Arduino.math_random_int.random_function = functionName;
    var func = [];
    func.push('int ' + functionName + '(int min, int max) {');
    func.push('  if (min > max) {');
    func.push('    // Swap min and max to ensure min is smaller.');
    func.push('    int temp = min;');
    func.push('    min = max;');
    func.push('    max = temp;');
    func.push('  }');
    func.push('  return min + (rand() % (max - min + 1));');
    func.push('}');
    Blockly.Arduino.definitions_['math_random_int'] = func.join('\n');
  }
  var code = Blockly.Arduino.math_random_int.random_function +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.Arduino.ORDER_UNARY_POSTFIX];
};

/**
 * Generator for a random float from 0 to 1.
 * Arduino code: loop { (rand() / RAND_MAX) }
 */
Blockly.Arduino['math_random_float'] = function(block) {
  return ['(rand() / RAND_MAX)', Blockly.Arduino.ORDER_UNARY_POSTFIX];
};
