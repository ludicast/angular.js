'use strict';

describe('parser', function() {
  describe('lexer', function() {
    it('should tokenize a string', function() {
      var tokens = lex("a.bc[22]+1.3|f:'a\\\'c':\"d\\\"e\"");
      var i = 0;
      expect(tokens[i].index).toEqual(0);
      expect(tokens[i].text).toEqual('a.bc');

      i++;
      expect(tokens[i].index).toEqual(4);
      expect(tokens[i].text).toEqual('[');

      i++;
      expect(tokens[i].index).toEqual(5);
      expect(tokens[i].text).toEqual(22);

      i++;
      expect(tokens[i].index).toEqual(7);
      expect(tokens[i].text).toEqual(']');

      i++;
      expect(tokens[i].index).toEqual(8);
      expect(tokens[i].text).toEqual('+');

      i++;
      expect(tokens[i].index).toEqual(9);
      expect(tokens[i].text).toEqual(1.3);

      i++;
      expect(tokens[i].index).toEqual(12);
      expect(tokens[i].text).toEqual('|');

      i++;
      expect(tokens[i].index).toEqual(13);
      expect(tokens[i].text).toEqual('f');

      i++;
      expect(tokens[i].index).toEqual(14);
      expect(tokens[i].text).toEqual(':');

      i++;
      expect(tokens[i].index).toEqual(15);
      expect(tokens[i].string).toEqual("a'c");

      i++;
      expect(tokens[i].index).toEqual(21);
      expect(tokens[i].text).toEqual(':');

      i++;
      expect(tokens[i].index).toEqual(22);
      expect(tokens[i].string).toEqual('d"e');
    });

    it('should tokenize undefined', function() {
      var tokens = lex("undefined");
      var i = 0;
      expect(tokens[i].index).toEqual(0);
      expect(tokens[i].text).toEqual('undefined');
      expect(undefined).toEqual(tokens[i].fn());
    });

    it('should tokenize quoted string', function() {
      var str = "['\\'', \"\\\"\"]";
      var tokens = lex(str);

      expect(tokens[1].index).toEqual(1);
      expect(tokens[1].string).toEqual("'");

      expect(tokens[3].index).toEqual(7);
      expect(tokens[3].string).toEqual('"');
    });

    it('should tokenize escaped quoted string', function() {
      var str = '"\\"\\n\\f\\r\\t\\v\\u00A0"';
      var tokens = lex(str);

      expect(tokens[0].string).toEqual('"\n\f\r\t\v\u00A0');
    });

    it('should tokenize unicode', function() {
      var tokens = lex('"\\u00A0"');
      expect(tokens.length).toEqual(1);
      expect(tokens[0].string).toEqual('\u00a0');
    });

    it('should ignore whitespace', function() {
      var tokens = lex("a \t \n \r b");
      expect(tokens[0].text).toEqual('a');
      expect(tokens[1].text).toEqual('b');
    });

    it('should tokenize relation', function() {
      var tokens = lex("! == != < > <= >=");
      expect(tokens[0].text).toEqual('!');
      expect(tokens[1].text).toEqual('==');
      expect(tokens[2].text).toEqual('!=');
      expect(tokens[3].text).toEqual('<');
      expect(tokens[4].text).toEqual('>');
      expect(tokens[5].text).toEqual('<=');
      expect(tokens[6].text).toEqual('>=');
    });

    it('should tokenize statements', function() {
      var tokens = lex("a;b;");
      expect(tokens[0].text).toEqual('a');
      expect(tokens[1].text).toEqual(';');
      expect(tokens[2].text).toEqual('b');
      expect(tokens[3].text).toEqual(';');
    });

    it('should tokenize number', function() {
      var tokens = lex("0.5");
      expect(tokens[0].text).toEqual(0.5);
    });

    it('should tokenize negative number', inject(function($rootScope) {
      var value = $rootScope.$eval("-0.5");
      expect(value).toEqual(-0.5);

      value = $rootScope.$eval("{a:-0.5}");
      expect(value).toEqual({a:-0.5});
    }));

    it('should tokenize number with exponent', inject(function($rootScope) {
      var tokens = lex("0.5E-10");
      expect(tokens[0].text).toEqual(0.5E-10);
      expect($rootScope.$eval("0.5E-10")).toEqual(0.5E-10);

      tokens = lex("0.5E+10");
      expect(tokens[0].text).toEqual(0.5E+10);
    }));

    it('should throws exception for invalid exponent', function() {
      expect(function() {
        lex("0.5E-");
      }).toThrow(new Error('Lexer Error: Invalid exponent at column 4 in expression [0.5E-].'));

      expect(function() {
        lex("0.5E-A");
      }).toThrow(new Error('Lexer Error: Invalid exponent at column 4 in expression [0.5E-A].'));
    });

    it('should tokenize number starting with a dot', function() {
      var tokens = lex(".5");
      expect(tokens[0].text).toEqual(0.5);
    });

    it('should throw error on invalid unicode', function() {
      expect(function() {
        lex("'\\u1''bla'");
      }).toThrow(new Error("Lexer Error: Invalid unicode escape [\\u1''b] at column 2 in expression ['\\u1''bla']."));
    });
  });

  var scope, $filterProvider;
  beforeEach(module(['$filterProvider', function (filterProvider) {
    $filterProvider = filterProvider;
  }]));
  beforeEach(inject(function ($rootScope) {
    scope = $rootScope;
  }));

  it('should parse expressions', function() {
    expect(scope.$eval("-1")).toEqual(-1);
    expect(scope.$eval("1 + 2.5")).toEqual(3.5);
    expect(scope.$eval("1 + -2.5")).toEqual(-1.5);
    expect(scope.$eval("1+2*3/4")).toEqual(1+2*3/4);
    expect(scope.$eval("0--1+1.5")).toEqual(0- -1 + 1.5);
    expect(scope.$eval("-0--1++2*-3/-4")).toEqual(-0- -1+ +2*-3/-4);
    expect(scope.$eval("1/2*3")).toEqual(1/2*3);
  });

  it('should parse comparison', function() {
    expect(scope.$eval("false")).toBeFalsy();
    expect(scope.$eval("!true")).toBeFalsy();
    expect(scope.$eval("1==1")).toBeTruthy();
    expect(scope.$eval("1!=2")).toBeTruthy();
    expect(scope.$eval("1<2")).toBeTruthy();
    expect(scope.$eval("1<=1")).toBeTruthy();
    expect(scope.$eval("1>2")).toEqual(1>2);
    expect(scope.$eval("2>=1")).toEqual(2>=1);
    expect(scope.$eval("true==2<3")).toEqual(true === 2<3);
  });

  it('should parse logical', function() {
    expect(scope.$eval("0&&2")).toEqual(0&&2);
    expect(scope.$eval("0||2")).toEqual(0||2);
    expect(scope.$eval("0||1&&2")).toEqual(0||1&&2);
  });

  it('should parse string', function() {
    expect(scope.$eval("'a' + 'b c'")).toEqual("ab c");
  });

  it('should parse filters', function() {
    $filterProvider.register('substring', valueFn(function(input, start, end) {
      return input.substring(start, end);
    }));

    expect(function() {
      scope.$eval("1|nonexistent");
    }).toThrow(new Error("Unknown provider: nonexistentFilterProvider <- nonexistentFilter"));

    scope.offset =  3;
    expect(scope.$eval("'abcd'|substring:1:offset")).toEqual("bc");
    expect(scope.$eval("'abcd'|substring:1:3|uppercase")).toEqual("BC");
  });

  it('should access scope', function() {
    scope.a =  123;
    scope.b = {c: 456};
    expect(scope.$eval("a", scope)).toEqual(123);
    expect(scope.$eval("b.c", scope)).toEqual(456);
    expect(scope.$eval("x.y.z", scope)).not.toBeDefined();
  });

  it('should evaluate grouped expressions', function() {
    expect(scope.$eval("(1+2)*3")).toEqual((1+2)*3);
  });

  it('should evaluate assignments', function() {
    expect(scope.$eval("a=12")).toEqual(12);
    expect(scope.a).toEqual(12);

    expect(scope.$eval("x.y.z=123;")).toEqual(123);
    expect(scope.x.y.z).toEqual(123);

    expect(scope.$eval("a=123; b=234")).toEqual(234);
    expect(scope.a).toEqual(123);
    expect(scope.b).toEqual(234);
  });

  it('should evaluate function call without arguments', function() {
    scope['const'] =  function(a,b){return 123;};
    expect(scope.$eval("const()")).toEqual(123);
  });

  it('should evaluate function call with arguments', function() {
    scope.add =  function(a,b) {
      return a+b;
    };
    expect(scope.$eval("add(1,2)")).toEqual(3);
  });

  it('should evaluate multiplication and division', function() {
    scope.taxRate =  8;
    scope.subTotal =  100;
    expect(scope.$eval("taxRate / 100 * subTotal")).toEqual(8);
    expect(scope.$eval("subTotal * taxRate / 100")).toEqual(8);
  });

  it('should evaluate array', function() {
    expect(scope.$eval("[]").length).toEqual(0);
    expect(scope.$eval("[1, 2]").length).toEqual(2);
    expect(scope.$eval("[1, 2]")[0]).toEqual(1);
    expect(scope.$eval("[1, 2]")[1]).toEqual(2);
  });

  it('should evaluate array access', function() {
    expect(scope.$eval("[1][0]")).toEqual(1);
    expect(scope.$eval("[[1]][0][0]")).toEqual(1);
    expect(scope.$eval("[].length")).toEqual(0);
    expect(scope.$eval("[1, 2].length")).toEqual(2);
  });

  it('should evaluate object', function() {
    expect(toJson(scope.$eval("{}"))).toEqual("{}");
    expect(toJson(scope.$eval("{a:'b'}"))).toEqual('{"a":"b"}');
    expect(toJson(scope.$eval("{'a':'b'}"))).toEqual('{"a":"b"}');
    expect(toJson(scope.$eval("{\"a\":'b'}"))).toEqual('{"a":"b"}');
  });

  it('should evaluate object access', function() {
    expect(scope.$eval("{false:'WC', true:'CC'}[false]")).toEqual("WC");
  });

  it('should evaluate JSON', function() {
    expect(toJson(scope.$eval("[{}]"))).toEqual("[{}]");
    expect(toJson(scope.$eval("[{a:[]}, {b:1}]"))).toEqual('[{"a":[]},{"b":1}]');
  });

  it('should evaluate multipple statements', function() {
    expect(scope.$eval("a=1;b=3;a+b")).toEqual(4);
    expect(scope.$eval(";;1;;")).toEqual(1);
  });

  it('should evaluate object methods in correct context (this)', function() {
    var C = function () {
      this.a = 123;
    };
    C.prototype.getA = function() {
      return this.a;
    };

    scope.obj = new C();
    expect(scope.$eval("obj.getA()")).toEqual(123);
  });

  it('should evaluate methods in correct context (this) in argument', function() {
    var C = function () {
      this.a = 123;
    };
    C.prototype.sum = function(value) {
      return this.a + value;
    };
    C.prototype.getA = function() {
      return this.a;
    };

    scope.obj = new C();
    expect(scope.$eval("obj.sum(obj.getA())")).toEqual(246);
  });

  it('should evaluate objects on scope context', function() {
    scope.a =  "abc";
    expect(scope.$eval("{a:a}").a).toEqual("abc");
  });

  it('should evaluate field access on function call result', function() {
    scope.a =  function() {
      return {name:'misko'};
    };
    expect(scope.$eval("a().name")).toEqual("misko");
  });

  it('should evaluate field access after array access', function () {
    scope.items =  [{}, {name:'misko'}];
    expect(scope.$eval('items[1].name')).toEqual("misko");
  });

  it('should evaluate array assignment', function() {
    scope.items =  [];

    expect(scope.$eval('items[1] = "abc"')).toEqual("abc");
    expect(scope.$eval('items[1]')).toEqual("abc");
//    Dont know how to make this work....
//    expect(scope.$eval('books[1] = "moby"')).toEqual("moby");
//    expect(scope.$eval('books[1]')).toEqual("moby");
  });

  it('should evaluate grouped filters', function() {
    scope.name = 'MISKO';
    expect(scope.$eval('n = (name|lowercase)')).toEqual('misko');
    expect(scope.$eval('n')).toEqual('misko');
  });

  it('should evaluate remainder', function() {
    expect(scope.$eval('1%2')).toEqual(1);
  });

  it('should evaluate sum with undefined', function() {
    expect(scope.$eval('1+undefined')).toEqual(1);
    expect(scope.$eval('undefined+1')).toEqual(1);
  });

  it('should throw exception on non-closed bracket', function() {
    expect(function() {
      scope.$eval('[].count(');
    }).toThrow('Unexpected end of expression: [].count(');
  });

  it('should evaluate double negation', function() {
    expect(scope.$eval('true')).toBeTruthy();
    expect(scope.$eval('!true')).toBeFalsy();
    expect(scope.$eval('!!true')).toBeTruthy();
    expect(scope.$eval('{true:"a", false:"b"}[!!true]')).toEqual('a');
  });

  it('should evaluate negation', function() {
    expect(scope.$eval("!false || true")).toEqual(!false || true);
    expect(scope.$eval("!11 == 10")).toEqual(!11 == 10);
    expect(scope.$eval("12/6/2")).toEqual(12/6/2);
  });

  it('should evaluate exclamation mark', function() {
    expect(scope.$eval('suffix = "!"')).toEqual('!');
  });

  it('should evaluate minus', function() {
    expect(scope.$eval("{a:'-'}")).toEqual({a: "-"});
  });

  it('should evaluate undefined', function() {
    expect(scope.$eval("undefined")).not.toBeDefined();
    expect(scope.$eval("a=undefined")).not.toBeDefined();
    expect(scope.a).not.toBeDefined();
  });

  it('should allow assignment after array dereference', function() {
    scope.obj = [{}];
    scope.$eval('obj[0].name=1');
    expect(scope.obj.name).toBeUndefined();
    expect(scope.obj[0].name).toEqual(1);
  });

  it('should short-circuit AND operator', function() {
    scope.run = function() {
      throw "IT SHOULD NOT HAVE RUN";
    };
    expect(scope.$eval('false && run()')).toBe(false);
  });

  it('should short-circuit OR operator', function() {
    scope.run = function() {
      throw "IT SHOULD NOT HAVE RUN";
    };
    expect(scope.$eval('true || run()')).toBe(true);
  });


  describe('promises', function() {
    var deferred, promise, q;

    beforeEach(inject(function($q) {
      q = $q;
      deferred = q.defer();
      promise = deferred.promise;
    }));

    describe('{{promise}}', function() {
      it('should evaluated resolved promise and get its value', function() {
        deferred.resolve('hello!');
        scope.greeting = promise;
        expect(scope.$eval('greeting')).toBe(undefined);
        scope.$digest();
        expect(scope.$eval('greeting')).toBe('hello!');
      });


      it('should evaluated rejected promise and ignore the rejection reason', function() {
        deferred.reject('sorry');
        scope.greeting = promise;
        expect(scope.$eval('gretting')).toBe(undefined);
        scope.$digest();
        expect(scope.$eval('greeting')).toBe(undefined);
      });


      it('should evaluate a promise and eventualy get its value', function() {
        scope.greeting = promise;
        expect(scope.$eval('greeting')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('greeting')).toBe(undefined);

        deferred.resolve('hello!');
        expect(scope.$eval('greeting')).toBe(undefined);
        scope.$digest();
        expect(scope.$eval('greeting')).toBe('hello!');
      });


      it('should evaluate a promise and eventualy ignore its rejection', function() {
        scope.greeting = promise;
        expect(scope.$eval('greeting')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('greeting')).toBe(undefined);

        deferred.reject('sorry');
        expect(scope.$eval('greeting')).toBe(undefined);
        scope.$digest();
        expect(scope.$eval('greeting')).toBe(undefined);
      });
    });

    describe('dereferencing', function() {
      it('should evaluate and dereference properties leading to and from a promise', function() {
        scope.obj = {greeting: promise};
        expect(scope.$eval('obj.greeting')).toBe(undefined);
        expect(scope.$eval('obj.greeting.polite')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('obj.greeting')).toBe(undefined);
        expect(scope.$eval('obj.greeting.polite')).toBe(undefined);

        deferred.resolve({polite: 'Good morning!'});
        scope.$digest();
        expect(scope.$eval('obj.greeting')).toEqual({polite: 'Good morning!'});
        expect(scope.$eval('obj.greeting.polite')).toBe('Good morning!');
      });

      it('should evaluate and dereference properties leading to and from a promise via bracket ' +
          'notation', function() {
        scope.obj = {greeting: promise};
        expect(scope.$eval('obj["greeting"]')).toBe(undefined);
        expect(scope.$eval('obj["greeting"]["polite"]')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('obj["greeting"]')).toBe(undefined);
        expect(scope.$eval('obj["greeting"]["polite"]')).toBe(undefined);

        deferred.resolve({polite: 'Good morning!'});
        scope.$digest();
        expect(scope.$eval('obj["greeting"]')).toEqual({polite: 'Good morning!'});
        expect(scope.$eval('obj["greeting"]["polite"]')).toBe('Good morning!');
      });


      it('should evaluate and dereference array references leading to and from a promise',
          function() {
        scope.greetings = [promise];
        expect(scope.$eval('greetings[0]')).toBe(undefined);
        expect(scope.$eval('greetings[0][0]')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('greetings[0]')).toBe(undefined);
        expect(scope.$eval('greetings[0][0]')).toBe(undefined);

        deferred.resolve(['Hi!', 'Cau!']);
        scope.$digest();
        expect(scope.$eval('greetings[0]')).toEqual(['Hi!', 'Cau!']);
        expect(scope.$eval('greetings[0][0]')).toBe('Hi!');
      });


      it('should evaluate and dereference promises used as function arguments', function() {
        scope.greet = function(name) { return 'Hi ' + name + '!'; };
        scope.name = promise;
        expect(scope.$eval('greet(name)')).toBe('Hi undefined!');

        scope.$digest();
        expect(scope.$eval('greet(name)')).toBe('Hi undefined!');

        deferred.resolve('Veronica');
        expect(scope.$eval('greet(name)')).toBe('Hi undefined!');

        scope.$digest();
        expect(scope.$eval('greet(name)')).toBe('Hi Veronica!');
      });


      it('should evaluate and dereference promises used as array indexes', function() {
        scope.childIndex = promise;
        scope.kids = ['Adam', 'Veronica', 'Elisa'];
        expect(scope.$eval('kids[childIndex]')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('kids[childIndex]')).toBe(undefined);

        deferred.resolve(1);
        expect(scope.$eval('kids[childIndex]')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('kids[childIndex]')).toBe('Veronica');
      });


      it('should evaluate and dereference promises used as keys in bracket notation', function() {
        scope.childKey = promise;
        scope.kids = {'a': 'Adam', 'v': 'Veronica', 'e': 'Elisa'};

        expect(scope.$eval('kids[childKey]')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('kids[childKey]')).toBe(undefined);

        deferred.resolve('v');
        expect(scope.$eval('kids[childKey]')).toBe(undefined);

        scope.$digest();
        expect(scope.$eval('kids[childKey]')).toBe('Veronica');
      });


      it('should not mess with the promise if it was not directly evaluated', function() {
        scope.obj = {greeting: promise, username: 'hi'};
        var obj = scope.$eval('obj');
        expect(obj.username).toEqual('hi');
        expect(typeof obj.greeting.then).toBe('function');
      });
    });
  });


  describe('assignable', function() {
    it('should expose assignment function', inject(function($parse) {
      var fn = $parse('a');
      expect(fn.assign).toBeTruthy();
      var scope = {};
      fn.assign(scope, 123);
      expect(scope).toEqual({a:123});
    }));
  });
});
