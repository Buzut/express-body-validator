const BadRequestError = require('bad-request-error');
const v8n = require('v8n');

/**
 * Verify that no post param is missing
 * @param { Object } req
 * @param { Array.<String|Object> } paramsList
 * @return { Promise }
 * @return { Promise.resolve<Object> }
 * @return { Promise.reject<BadRequestError> }
 */
function validateRequest(req, paramsList) {
    const wrongTypeErr = (paramName, paramType) => Promise.reject(new BadRequestError(`${paramName} param must be a ${paramType}`));
    const validatorFnErr = msg => Promise.reject(new BadRequestError(msg));
    const validatorFnErrDefaultMsg = paramName => `${paramName} failed to validate`;

    for (const param of paramsList) { // eslint-disable-line
        let paramName;
        let paramType;
        let paramCoerce;
        let paramOptional;
        let validatorFn;
        let validatorFailMsg;
        let customValidatorFn;

        // define if string or object
        if (v8n().object().test(param)) {
            const paramKeys = Object.keys(param);

            if (paramKeys.length === 1) {
                [paramName] = paramKeys;
                paramType = param[paramName];
            }

            else {
                paramName = param.name;
                paramType = param.type;
                paramCoerce = param.coerce;
                paramOptional = param.optional;
                validatorFn = param.validator;
                validatorFailMsg = param.failMsg;
                customValidatorFn = param.customValidator;

                if (!paramName) throw new Error('Parameters object that have more than { paramName: paramType } must have a "name" property');
            }

            if (paramType !== 'string' && paramType !== 'object' && paramType !== 'array' && paramType !== 'number' && paramType !== 'integer' && paramType !== 'boolean') {
                throw new Error(`Type "${paramType}" is not supported. Type must be one of: string, object, array, number, integer, boolean`);
            }
        }

        else paramName = param;

        // validate presence
        if (!req.body[paramName] && paramType !== 'boolean' && !paramOptional) return Promise.reject(new BadRequestError(`Missing ${paramName} param`));
        if (!req.body[paramName] && paramType === 'boolean' && typeof req.body[paramName] !== 'boolean') return Promise.reject(new BadRequestError(`Missing ${paramName} param`));
        if (!req.body[paramName] && paramOptional) continue; // eslint-disable-line

        // coerce if necessary
        if (paramCoerce && paramType === 'string' && v8n().number().test(req.body[paramName])) req.body[paramName] = req.body[paramName].toString();
        else if (paramCoerce && (paramType === 'integer' || paramType === 'number')) req.body[paramName] = Number(req.body[paramName]);
        else if (paramCoerce && paramType === 'boolean') req.body[paramName] = (req.body[paramName] === 'true' || req.body[paramName] === true);
        const paramValue = req.body[paramName];

        // validate type
        if (paramType) {
            if (paramType === 'string' && !v8n().string().test(paramValue)) return wrongTypeErr(paramName, paramType);
            if (paramType === 'object' && !v8n().object().test(paramValue)) return wrongTypeErr(paramName, paramType);
            if (paramType === 'array' && !v8n().array().test(paramValue)) return wrongTypeErr(paramName, paramType);
            if (paramType === 'number' && !v8n().number().test(paramValue)) return wrongTypeErr(paramName, paramType);
            if (paramType === 'integer' && !v8n().number().test(paramValue)) return wrongTypeErr(paramName, paramType);
            if (paramType === 'boolean' && !v8n().boolean().test(paramValue)) return wrongTypeErr(paramName, paramType);
        }

        // custom validation
        if (validatorFn && !validatorFn(v8n()).test(paramValue)) {
            if (validatorFailMsg) return validatorFnErr(validatorFailMsg);
            return validatorFnErr(validatorFnErrDefaultMsg(paramName));
        }

        if (customValidatorFn && !customValidatorFn(paramValue)) {
            if (validatorFailMsg) return validatorFnErr(validatorFailMsg);
            return validatorFnErr(validatorFnErrDefaultMsg(paramName));
        }
    }

    return Promise.resolve(req.body);
}

module.exports = validateRequest;
