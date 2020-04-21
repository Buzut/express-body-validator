# Express body validator
Makes parameters validation in Express.js a breeze. With promise chaining, you validate incoming requests straight away, data flows between controllers and models and errored requests are efficiently handled.

As an exemple, let's validate a login request.

```js
// /controllers/userController

const validateRequest = require('express-body-validator');
const handleError = require('../lib/handleError');
const userModel = require('../models/userModel');

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,6}$/i;

exports.register = function (req, res) {
    validateRequest(req, [
        { name: 'email', type: 'string', validator: v => v.pattern(emailRegex), failMsg: 'email must be an email string' },
        { name: 'password', type: 'string', validator: v => v.minLength(8).maxLength(50), failMsg: 'password must be comprised between 8 and 50 chars' }
    ])
    .then(post => userModel.create(post.email, post.password))
    .then(([id, token]) => res.status(201).json({ id, token })
    .catch(err => handleError(err, res));
};
```

Simple, expressive and beautifully powerful, right? Data flows thoughout your app.

Convinced? Let's explore all the possibilities in the next section.

## Installation & usage
The module requires at least Node V6, appart from this, its install procedure is boringly conventional.

```js
npm install --save express-body-validator
```

This validator is based on the amazing [v8n](https://imbrn.github.io/v8n/) validation library and the handy [bad-request-error](https://github.com/Buzut/bad-request-error). The first one allows us to use its very powerfull API, while the second makes responding to errors a breeze.

To validate a request, you simply pass `validateRequest` your `request` (`req` in the above code) object with an array of all the parameters you want to validate. The validator returns a promise with either an error or an object with **all** the parameters contained in the initial [`request.body`](https://expressjs.com/en/api.html#req.body).

What's not specified in the validation array is **left untouched and returned as is**, without any check.

### Type validation
The simplest thing you want to do is validate the type of the parameter. For this simple case, you just use a simple object.

```js
{ paramName: 'paramType' }
```

#### Available types
Build in types are:
* Array
* Boolean
* Integer
* Number
* Object
* String

### Validate type and some conditions
Now, if you want to add some conditions like length, case or interval, you can easily leverage all the power of the [v8n api](https://imbrn.github.io/v8n/api/) by specifying a `validator` function. Here is an exemple object to make sure that an `age` param is integer and between 7 and 77 years old.

```js
{ name: 'age', type: 'integer', validator: v => v.between(7, 77) }
```

As you can notice, as soon as you add a validator, you can no longer use the short single property syntax that we used earlier. The parameter name has to be defined with the `name` property, and the type is in turn defined through the `type` property.

Also, the beauty of v8n is that validation conditions can be chained. Let's say we won't accept subscription of users that are 40 years old.

```js
{ name: 'age', type: 'integer', validator: v => v.between(7, 77).not(40) }
```

As already said, v8n is very powerfull, especially with chaining and modifiers. We could decide to only allow for odd ages or whatever are requirements could be.

### Parameter type conversion
Sometimes, we get the right value but of the wront type. For instance, forms always send values as strings. That's why you might want to consider converting your value before validating it.

The conversion is available for the following types:
* String
* Integer
* Boolean

When used, the given parameter is converted before the validation checks are ran and, if validation passes, parameter is returned converted in the success promise.

To use conversion, you just have to add `coerce: true` to your validaion object. In our previous exemple, this would be like so:

```js
{ name: 'age', type: 'integer', validator: v => v.between(7, 77), coerce: true }
```

### Optional parameter
Very often, we have some optional parameters. They have to be validated if present, but validation shouldn't fail if they miss. That's just adding an `optional` property.

Let's say that in our previous exemple, the age parameter is not mandatory for user to register.

```js
{ name: 'age', type: 'integer', validator: v => v.between(7, 77), optional: true, coerce: true }
```

### Custom validator
As powerfull as v8n can be, at some point you might want to use a custom validation function. This is also very easy. You function is passed the parameter value and must return `true` if validation passes or `false` otherwise.

```js
function validateUserName(userName) {
    // whatever validation you have to do
    return isValid; // this is a boolean
}
```

Then, your validation object would be like so:

```js
{ name: 'username', type: 'string', customValidator: validateUserName }
```

You can obviously make a type check before running your custom validation function. Also, you might want to use a custom validation library like [validator](https://github.com/chriso/validator.js), all of their validation functions return a bool, so it's 100% compatible, if not recommanded 😉

### Custom error message
In case of error, an instance of [`BadRequestError`](https://github.com/Buzut/bad-request-error) is returned. This error object inherits from the [`Error` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error), contains an error message in its `message` property and the HTTP error code `400` (Bad Request) in its `httpStatus` property.

Generated messages are:

* `Missing paramName param` if parameter is missing,
* `paramName param must be a paramType` if type check fails,
* `paramName failed to validate` in case of advanced or custom validation.

By using the `failMsg` property, you can provide a custom error message in case your advanced or custom validation fails.

```js
{ name: 'age', type: 'integer', validator: v => v.between(7, 77), coerce: true, failMsg: 'user cannot be younger that 7 or older than 77 years' }
```

### Handling errors
Again, everything is promise based, so you handle errors in the `catch` block. To save you some lines of code, I'd strngly recommand to take advantage of the [bad-request-error](https://github.com/Buzut/bad-request-error) and use a function to automatically handle errors like in the first exemple.

The `handleError` function used in the first exemple is very simple and allows you to delegate all errors throughout your app. It will respond with an error code in case of a `BadRequestError`, or respond with a `500` error code otherwise while also logging it. If `response` object is not provided (async handler, errors not meant to be sent to user…), it will just log the error.

```js
/**
 * Send client err if it's validation error or log if it's a native or low level error
 * @param { Object } err error object
 * @param { Object } [res]
 */
function handleError(err, res) {
    // send errmsg to user if it's a BadRequestError
    if (res && err.name && err.name === 'BadRequestError') {
        res.status(err.httpStatus).json({ error: err.message });
        return;
    }

    // send http err if res object is provided
    if (res) res.status(500).send('Server Error');

    // if it's more low level, or if errorField isn't an error's propt
    console.error(err); // or custom logger like winston
}

module.exports = handleError;
```

*And boom, you got rid of a hell lot of boilerplate code!*

## Contributing
There's sure room for improvement, so feel free to hack around and submit PRs!
Please just follow the style of the existing code, which is [Airbnb's style](http://airbnb.io/javascript/) with [minor modifications](.eslintrc).

To maintain things clear and visual, please follow the [git commit template](https://github.com/Buzut/git-emojis-hook).
