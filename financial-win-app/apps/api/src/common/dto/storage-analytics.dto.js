"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsHealthDto = exports.UsageStatsByPeriodDto = exports.SystemStorageOverviewDto = exports.RecentActivityDto = exports.StorageDistributionDto = exports.TopUserDto = exports.StorageAlertDto = exports.UserStorageStatsDto = void 0;
var swagger_1 = require("@nestjs/swagger");
var class_validator_1 = require("class-validator");
var UserStorageStatsDto = function () {
    var _a;
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _totalFiles_decorators;
    var _totalFiles_initializers = [];
    var _totalFiles_extraInitializers = [];
    var _totalSizeBytes_decorators;
    var _totalSizeBytes_initializers = [];
    var _totalSizeBytes_extraInitializers = [];
    var _totalSizeMB_decorators;
    var _totalSizeMB_initializers = [];
    var _totalSizeMB_extraInitializers = [];
    var _filesByType_decorators;
    var _filesByType_initializers = [];
    var _filesByType_extraInitializers = [];
    var _filesByAgent_decorators;
    var _filesByAgent_initializers = [];
    var _filesByAgent_extraInitializers = [];
    var _lastUploadDate_decorators;
    var _lastUploadDate_initializers = [];
    var _lastUploadDate_extraInitializers = [];
    var _oldestFileDate_decorators;
    var _oldestFileDate_initializers = [];
    var _oldestFileDate_extraInitializers = [];
    var _averageFileSize_decorators;
    var _averageFileSize_initializers = [];
    var _averageFileSize_extraInitializers = [];
    var _storageUsagePercentage_decorators;
    var _storageUsagePercentage_initializers = [];
    var _storageUsagePercentage_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UserStorageStatsDto() {
                this.userId = __runInitializers(this, _userId_initializers, void 0);
                this.totalFiles = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _totalFiles_initializers, void 0));
                this.totalSizeBytes = (__runInitializers(this, _totalFiles_extraInitializers), __runInitializers(this, _totalSizeBytes_initializers, void 0));
                this.totalSizeMB = (__runInitializers(this, _totalSizeBytes_extraInitializers), __runInitializers(this, _totalSizeMB_initializers, void 0));
                this.filesByType = (__runInitializers(this, _totalSizeMB_extraInitializers), __runInitializers(this, _filesByType_initializers, void 0));
                this.filesByAgent = (__runInitializers(this, _filesByType_extraInitializers), __runInitializers(this, _filesByAgent_initializers, void 0));
                this.lastUploadDate = (__runInitializers(this, _filesByAgent_extraInitializers), __runInitializers(this, _lastUploadDate_initializers, void 0));
                this.oldestFileDate = (__runInitializers(this, _lastUploadDate_extraInitializers), __runInitializers(this, _oldestFileDate_initializers, void 0));
                this.averageFileSize = (__runInitializers(this, _oldestFileDate_extraInitializers), __runInitializers(this, _averageFileSize_initializers, void 0));
                this.storageUsagePercentage = (__runInitializers(this, _averageFileSize_extraInitializers), __runInitializers(this, _storageUsagePercentage_initializers, void 0));
                __runInitializers(this, _storageUsagePercentage_extraInitializers);
            }
            return UserStorageStatsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _userId_decorators = [(0, swagger_1.ApiProperty)({ description: 'ID del usuario' }), (0, class_validator_1.IsString)()];
            _totalFiles_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número total de archivos' }), (0, class_validator_1.IsNumber)()];
            _totalSizeBytes_decorators = [(0, swagger_1.ApiProperty)({ description: 'Tamaño total en bytes' }), (0, class_validator_1.IsNumber)()];
            _totalSizeMB_decorators = [(0, swagger_1.ApiProperty)({ description: 'Tamaño total en MB' }), (0, class_validator_1.IsNumber)()];
            _filesByType_decorators = [(0, swagger_1.ApiProperty)({ description: 'Archivos agrupados por tipo MIME' }), (0, class_validator_1.IsObject)()];
            _filesByAgent_decorators = [(0, swagger_1.ApiProperty)({ description: 'Archivos agrupados por agente' }), (0, class_validator_1.IsObject)()];
            _lastUploadDate_decorators = [(0, swagger_1.ApiProperty)({ description: 'Fecha del último upload', required: false }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _oldestFileDate_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Fecha del archivo más antiguo',
                    required: false,
                }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsDateString)()];
            _averageFileSize_decorators = [(0, swagger_1.ApiProperty)({ description: 'Tamaño promedio de archivo en bytes' }), (0, class_validator_1.IsNumber)()];
            _storageUsagePercentage_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Porcentaje de uso del límite de almacenamiento',
                }), (0, class_validator_1.IsNumber)()];
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _totalFiles_decorators, { kind: "field", name: "totalFiles", static: false, private: false, access: { has: function (obj) { return "totalFiles" in obj; }, get: function (obj) { return obj.totalFiles; }, set: function (obj, value) { obj.totalFiles = value; } }, metadata: _metadata }, _totalFiles_initializers, _totalFiles_extraInitializers);
            __esDecorate(null, null, _totalSizeBytes_decorators, { kind: "field", name: "totalSizeBytes", static: false, private: false, access: { has: function (obj) { return "totalSizeBytes" in obj; }, get: function (obj) { return obj.totalSizeBytes; }, set: function (obj, value) { obj.totalSizeBytes = value; } }, metadata: _metadata }, _totalSizeBytes_initializers, _totalSizeBytes_extraInitializers);
            __esDecorate(null, null, _totalSizeMB_decorators, { kind: "field", name: "totalSizeMB", static: false, private: false, access: { has: function (obj) { return "totalSizeMB" in obj; }, get: function (obj) { return obj.totalSizeMB; }, set: function (obj, value) { obj.totalSizeMB = value; } }, metadata: _metadata }, _totalSizeMB_initializers, _totalSizeMB_extraInitializers);
            __esDecorate(null, null, _filesByType_decorators, { kind: "field", name: "filesByType", static: false, private: false, access: { has: function (obj) { return "filesByType" in obj; }, get: function (obj) { return obj.filesByType; }, set: function (obj, value) { obj.filesByType = value; } }, metadata: _metadata }, _filesByType_initializers, _filesByType_extraInitializers);
            __esDecorate(null, null, _filesByAgent_decorators, { kind: "field", name: "filesByAgent", static: false, private: false, access: { has: function (obj) { return "filesByAgent" in obj; }, get: function (obj) { return obj.filesByAgent; }, set: function (obj, value) { obj.filesByAgent = value; } }, metadata: _metadata }, _filesByAgent_initializers, _filesByAgent_extraInitializers);
            __esDecorate(null, null, _lastUploadDate_decorators, { kind: "field", name: "lastUploadDate", static: false, private: false, access: { has: function (obj) { return "lastUploadDate" in obj; }, get: function (obj) { return obj.lastUploadDate; }, set: function (obj, value) { obj.lastUploadDate = value; } }, metadata: _metadata }, _lastUploadDate_initializers, _lastUploadDate_extraInitializers);
            __esDecorate(null, null, _oldestFileDate_decorators, { kind: "field", name: "oldestFileDate", static: false, private: false, access: { has: function (obj) { return "oldestFileDate" in obj; }, get: function (obj) { return obj.oldestFileDate; }, set: function (obj, value) { obj.oldestFileDate = value; } }, metadata: _metadata }, _oldestFileDate_initializers, _oldestFileDate_extraInitializers);
            __esDecorate(null, null, _averageFileSize_decorators, { kind: "field", name: "averageFileSize", static: false, private: false, access: { has: function (obj) { return "averageFileSize" in obj; }, get: function (obj) { return obj.averageFileSize; }, set: function (obj, value) { obj.averageFileSize = value; } }, metadata: _metadata }, _averageFileSize_initializers, _averageFileSize_extraInitializers);
            __esDecorate(null, null, _storageUsagePercentage_decorators, { kind: "field", name: "storageUsagePercentage", static: false, private: false, access: { has: function (obj) { return "storageUsagePercentage" in obj; }, get: function (obj) { return obj.storageUsagePercentage; }, set: function (obj, value) { obj.storageUsagePercentage = value; } }, metadata: _metadata }, _storageUsagePercentage_initializers, _storageUsagePercentage_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UserStorageStatsDto = UserStorageStatsDto;
var StorageAlertDto = function () {
    var _a;
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _message_decorators;
    var _message_initializers = [];
    var _message_extraInitializers = [];
    var _severity_decorators;
    var _severity_initializers = [];
    var _severity_extraInitializers = [];
    var _threshold_decorators;
    var _threshold_initializers = [];
    var _threshold_extraInitializers = [];
    var _currentValue_decorators;
    var _currentValue_initializers = [];
    var _currentValue_extraInitializers = [];
    var _timestamp_decorators;
    var _timestamp_initializers = [];
    var _timestamp_extraInitializers = [];
    return _a = /** @class */ (function () {
            function StorageAlertDto() {
                this.userId = __runInitializers(this, _userId_initializers, void 0);
                this.type = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.message = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _message_initializers, void 0));
                this.severity = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _severity_initializers, void 0));
                this.threshold = (__runInitializers(this, _severity_extraInitializers), __runInitializers(this, _threshold_initializers, void 0));
                this.currentValue = (__runInitializers(this, _threshold_extraInitializers), __runInitializers(this, _currentValue_initializers, void 0));
                this.timestamp = (__runInitializers(this, _currentValue_extraInitializers), __runInitializers(this, _timestamp_initializers, void 0));
                __runInitializers(this, _timestamp_extraInitializers);
            }
            return StorageAlertDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _userId_decorators = [(0, swagger_1.ApiProperty)({ description: 'ID del usuario' }), (0, class_validator_1.IsString)()];
            _type_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Tipo de alerta',
                    enum: ['storage_limit', 'file_limit', 'quota_exceeded'],
                }), (0, class_validator_1.IsEnum)(['storage_limit', 'file_limit', 'quota_exceeded'])];
            _message_decorators = [(0, swagger_1.ApiProperty)({ description: 'Mensaje de la alerta' }), (0, class_validator_1.IsString)()];
            _severity_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Severidad de la alerta',
                    enum: ['warning', 'critical'],
                }), (0, class_validator_1.IsEnum)(['warning', 'critical'])];
            _threshold_decorators = [(0, swagger_1.ApiProperty)({ description: 'Umbral que activó la alerta' }), (0, class_validator_1.IsNumber)()];
            _currentValue_decorators = [(0, swagger_1.ApiProperty)({ description: 'Valor actual que causó la alerta' }), (0, class_validator_1.IsNumber)()];
            _timestamp_decorators = [(0, swagger_1.ApiProperty)({ description: 'Timestamp de cuando se generó la alerta' }), (0, class_validator_1.IsDateString)()];
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: function (obj) { return "message" in obj; }, get: function (obj) { return obj.message; }, set: function (obj, value) { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
            __esDecorate(null, null, _severity_decorators, { kind: "field", name: "severity", static: false, private: false, access: { has: function (obj) { return "severity" in obj; }, get: function (obj) { return obj.severity; }, set: function (obj, value) { obj.severity = value; } }, metadata: _metadata }, _severity_initializers, _severity_extraInitializers);
            __esDecorate(null, null, _threshold_decorators, { kind: "field", name: "threshold", static: false, private: false, access: { has: function (obj) { return "threshold" in obj; }, get: function (obj) { return obj.threshold; }, set: function (obj, value) { obj.threshold = value; } }, metadata: _metadata }, _threshold_initializers, _threshold_extraInitializers);
            __esDecorate(null, null, _currentValue_decorators, { kind: "field", name: "currentValue", static: false, private: false, access: { has: function (obj) { return "currentValue" in obj; }, get: function (obj) { return obj.currentValue; }, set: function (obj, value) { obj.currentValue = value; } }, metadata: _metadata }, _currentValue_initializers, _currentValue_extraInitializers);
            __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: function (obj) { return "timestamp" in obj; }, get: function (obj) { return obj.timestamp; }, set: function (obj, value) { obj.timestamp = value; } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.StorageAlertDto = StorageAlertDto;
var TopUserDto = function () {
    var _a;
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _storageMB_decorators;
    var _storageMB_initializers = [];
    var _storageMB_extraInitializers = [];
    var _fileCount_decorators;
    var _fileCount_initializers = [];
    var _fileCount_extraInitializers = [];
    return _a = /** @class */ (function () {
            function TopUserDto() {
                this.userId = __runInitializers(this, _userId_initializers, void 0);
                this.storageMB = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _storageMB_initializers, void 0));
                this.fileCount = (__runInitializers(this, _storageMB_extraInitializers), __runInitializers(this, _fileCount_initializers, void 0));
                __runInitializers(this, _fileCount_extraInitializers);
            }
            return TopUserDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _userId_decorators = [(0, swagger_1.ApiProperty)({ description: 'ID del usuario' }), (0, class_validator_1.IsString)()];
            _storageMB_decorators = [(0, swagger_1.ApiProperty)({ description: 'Almacenamiento usado en MB' }), (0, class_validator_1.IsNumber)()];
            _fileCount_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número de archivos' }), (0, class_validator_1.IsNumber)()];
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _storageMB_decorators, { kind: "field", name: "storageMB", static: false, private: false, access: { has: function (obj) { return "storageMB" in obj; }, get: function (obj) { return obj.storageMB; }, set: function (obj, value) { obj.storageMB = value; } }, metadata: _metadata }, _storageMB_initializers, _storageMB_extraInitializers);
            __esDecorate(null, null, _fileCount_decorators, { kind: "field", name: "fileCount", static: false, private: false, access: { has: function (obj) { return "fileCount" in obj; }, get: function (obj) { return obj.fileCount; }, set: function (obj, value) { obj.fileCount = value; } }, metadata: _metadata }, _fileCount_initializers, _fileCount_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.TopUserDto = TopUserDto;
var StorageDistributionDto = function () {
    var _a;
    var _range_decorators;
    var _range_initializers = [];
    var _range_extraInitializers = [];
    var _userCount_decorators;
    var _userCount_initializers = [];
    var _userCount_extraInitializers = [];
    return _a = /** @class */ (function () {
            function StorageDistributionDto() {
                this.range = __runInitializers(this, _range_initializers, void 0);
                this.userCount = (__runInitializers(this, _range_extraInitializers), __runInitializers(this, _userCount_initializers, void 0));
                __runInitializers(this, _userCount_extraInitializers);
            }
            return StorageDistributionDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _range_decorators = [(0, swagger_1.ApiProperty)({ description: 'Rango de almacenamiento' }), (0, class_validator_1.IsString)()];
            _userCount_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número de usuarios en este rango' }), (0, class_validator_1.IsNumber)()];
            __esDecorate(null, null, _range_decorators, { kind: "field", name: "range", static: false, private: false, access: { has: function (obj) { return "range" in obj; }, get: function (obj) { return obj.range; }, set: function (obj, value) { obj.range = value; } }, metadata: _metadata }, _range_initializers, _range_extraInitializers);
            __esDecorate(null, null, _userCount_decorators, { kind: "field", name: "userCount", static: false, private: false, access: { has: function (obj) { return "userCount" in obj; }, get: function (obj) { return obj.userCount; }, set: function (obj, value) { obj.userCount = value; } }, metadata: _metadata }, _userCount_initializers, _userCount_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.StorageDistributionDto = StorageDistributionDto;
var RecentActivityDto = function () {
    var _a;
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _action_decorators;
    var _action_initializers = [];
    var _action_extraInitializers = [];
    var _fileSize_decorators;
    var _fileSize_initializers = [];
    var _fileSize_extraInitializers = [];
    var _timestamp_decorators;
    var _timestamp_initializers = [];
    var _timestamp_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RecentActivityDto() {
                this.userId = __runInitializers(this, _userId_initializers, void 0);
                this.action = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _action_initializers, void 0));
                this.fileSize = (__runInitializers(this, _action_extraInitializers), __runInitializers(this, _fileSize_initializers, void 0));
                this.timestamp = (__runInitializers(this, _fileSize_extraInitializers), __runInitializers(this, _timestamp_initializers, void 0));
                __runInitializers(this, _timestamp_extraInitializers);
            }
            return RecentActivityDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _userId_decorators = [(0, swagger_1.ApiProperty)({ description: 'ID del usuario' }), (0, class_validator_1.IsString)()];
            _action_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Acción realizada',
                    enum: ['upload', 'delete'],
                }), (0, class_validator_1.IsEnum)(['upload', 'delete'])];
            _fileSize_decorators = [(0, swagger_1.ApiProperty)({ description: 'Tamaño del archivo en bytes', required: false }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _timestamp_decorators = [(0, swagger_1.ApiProperty)({ description: 'Timestamp de la actividad' }), (0, class_validator_1.IsDateString)()];
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _action_decorators, { kind: "field", name: "action", static: false, private: false, access: { has: function (obj) { return "action" in obj; }, get: function (obj) { return obj.action; }, set: function (obj, value) { obj.action = value; } }, metadata: _metadata }, _action_initializers, _action_extraInitializers);
            __esDecorate(null, null, _fileSize_decorators, { kind: "field", name: "fileSize", static: false, private: false, access: { has: function (obj) { return "fileSize" in obj; }, get: function (obj) { return obj.fileSize; }, set: function (obj, value) { obj.fileSize = value; } }, metadata: _metadata }, _fileSize_initializers, _fileSize_extraInitializers);
            __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: function (obj) { return "timestamp" in obj; }, get: function (obj) { return obj.timestamp; }, set: function (obj, value) { obj.timestamp = value; } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RecentActivityDto = RecentActivityDto;
var SystemStorageOverviewDto = function () {
    var _a;
    var _totalUsers_decorators;
    var _totalUsers_initializers = [];
    var _totalUsers_extraInitializers = [];
    var _totalFiles_decorators;
    var _totalFiles_initializers = [];
    var _totalFiles_extraInitializers = [];
    var _totalStorageMB_decorators;
    var _totalStorageMB_initializers = [];
    var _totalStorageMB_extraInitializers = [];
    var _averageStoragePerUser_decorators;
    var _averageStoragePerUser_initializers = [];
    var _averageStoragePerUser_extraInitializers = [];
    var _topUsers_decorators;
    var _topUsers_initializers = [];
    var _topUsers_extraInitializers = [];
    var _storageDistribution_decorators;
    var _storageDistribution_initializers = [];
    var _storageDistribution_extraInitializers = [];
    var _recentActivity_decorators;
    var _recentActivity_initializers = [];
    var _recentActivity_extraInitializers = [];
    return _a = /** @class */ (function () {
            function SystemStorageOverviewDto() {
                this.totalUsers = __runInitializers(this, _totalUsers_initializers, void 0);
                this.totalFiles = (__runInitializers(this, _totalUsers_extraInitializers), __runInitializers(this, _totalFiles_initializers, void 0));
                this.totalStorageMB = (__runInitializers(this, _totalFiles_extraInitializers), __runInitializers(this, _totalStorageMB_initializers, void 0));
                this.averageStoragePerUser = (__runInitializers(this, _totalStorageMB_extraInitializers), __runInitializers(this, _averageStoragePerUser_initializers, void 0));
                this.topUsers = (__runInitializers(this, _averageStoragePerUser_extraInitializers), __runInitializers(this, _topUsers_initializers, void 0));
                this.storageDistribution = (__runInitializers(this, _topUsers_extraInitializers), __runInitializers(this, _storageDistribution_initializers, void 0));
                this.recentActivity = (__runInitializers(this, _storageDistribution_extraInitializers), __runInitializers(this, _recentActivity_initializers, void 0));
                __runInitializers(this, _recentActivity_extraInitializers);
            }
            return SystemStorageOverviewDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _totalUsers_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número total de usuarios' }), (0, class_validator_1.IsNumber)()];
            _totalFiles_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número total de archivos' }), (0, class_validator_1.IsNumber)()];
            _totalStorageMB_decorators = [(0, swagger_1.ApiProperty)({ description: 'Almacenamiento total en MB' }), (0, class_validator_1.IsNumber)()];
            _averageStoragePerUser_decorators = [(0, swagger_1.ApiProperty)({ description: 'Promedio de almacenamiento por usuario en MB' }), (0, class_validator_1.IsNumber)()];
            _topUsers_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Top usuarios por almacenamiento',
                    type: [TopUserDto],
                })];
            _storageDistribution_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Distribución de almacenamiento por rangos',
                    type: [StorageDistributionDto],
                })];
            _recentActivity_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Actividad reciente del sistema',
                    type: [RecentActivityDto],
                })];
            __esDecorate(null, null, _totalUsers_decorators, { kind: "field", name: "totalUsers", static: false, private: false, access: { has: function (obj) { return "totalUsers" in obj; }, get: function (obj) { return obj.totalUsers; }, set: function (obj, value) { obj.totalUsers = value; } }, metadata: _metadata }, _totalUsers_initializers, _totalUsers_extraInitializers);
            __esDecorate(null, null, _totalFiles_decorators, { kind: "field", name: "totalFiles", static: false, private: false, access: { has: function (obj) { return "totalFiles" in obj; }, get: function (obj) { return obj.totalFiles; }, set: function (obj, value) { obj.totalFiles = value; } }, metadata: _metadata }, _totalFiles_initializers, _totalFiles_extraInitializers);
            __esDecorate(null, null, _totalStorageMB_decorators, { kind: "field", name: "totalStorageMB", static: false, private: false, access: { has: function (obj) { return "totalStorageMB" in obj; }, get: function (obj) { return obj.totalStorageMB; }, set: function (obj, value) { obj.totalStorageMB = value; } }, metadata: _metadata }, _totalStorageMB_initializers, _totalStorageMB_extraInitializers);
            __esDecorate(null, null, _averageStoragePerUser_decorators, { kind: "field", name: "averageStoragePerUser", static: false, private: false, access: { has: function (obj) { return "averageStoragePerUser" in obj; }, get: function (obj) { return obj.averageStoragePerUser; }, set: function (obj, value) { obj.averageStoragePerUser = value; } }, metadata: _metadata }, _averageStoragePerUser_initializers, _averageStoragePerUser_extraInitializers);
            __esDecorate(null, null, _topUsers_decorators, { kind: "field", name: "topUsers", static: false, private: false, access: { has: function (obj) { return "topUsers" in obj; }, get: function (obj) { return obj.topUsers; }, set: function (obj, value) { obj.topUsers = value; } }, metadata: _metadata }, _topUsers_initializers, _topUsers_extraInitializers);
            __esDecorate(null, null, _storageDistribution_decorators, { kind: "field", name: "storageDistribution", static: false, private: false, access: { has: function (obj) { return "storageDistribution" in obj; }, get: function (obj) { return obj.storageDistribution; }, set: function (obj, value) { obj.storageDistribution = value; } }, metadata: _metadata }, _storageDistribution_initializers, _storageDistribution_extraInitializers);
            __esDecorate(null, null, _recentActivity_decorators, { kind: "field", name: "recentActivity", static: false, private: false, access: { has: function (obj) { return "recentActivity" in obj; }, get: function (obj) { return obj.recentActivity; }, set: function (obj, value) { obj.recentActivity = value; } }, metadata: _metadata }, _recentActivity_initializers, _recentActivity_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.SystemStorageOverviewDto = SystemStorageOverviewDto;
var UsageStatsByPeriodDto = function () {
    var _a;
    var _period_decorators;
    var _period_initializers = [];
    var _period_extraInitializers = [];
    var _uploads_decorators;
    var _uploads_initializers = [];
    var _uploads_extraInitializers = [];
    var _totalSizeMB_decorators;
    var _totalSizeMB_initializers = [];
    var _totalSizeMB_extraInitializers = [];
    var _averageFileSizeMB_decorators;
    var _averageFileSizeMB_initializers = [];
    var _averageFileSizeMB_extraInitializers = [];
    var _filesByType_decorators;
    var _filesByType_initializers = [];
    var _filesByType_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UsageStatsByPeriodDto() {
                this.period = __runInitializers(this, _period_initializers, void 0);
                this.uploads = (__runInitializers(this, _period_extraInitializers), __runInitializers(this, _uploads_initializers, void 0));
                this.totalSizeMB = (__runInitializers(this, _uploads_extraInitializers), __runInitializers(this, _totalSizeMB_initializers, void 0));
                this.averageFileSizeMB = (__runInitializers(this, _totalSizeMB_extraInitializers), __runInitializers(this, _averageFileSizeMB_initializers, void 0));
                this.filesByType = (__runInitializers(this, _averageFileSizeMB_extraInitializers), __runInitializers(this, _filesByType_initializers, void 0));
                __runInitializers(this, _filesByType_extraInitializers);
            }
            return UsageStatsByPeriodDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _period_decorators = [(0, swagger_1.ApiProperty)({ description: 'Período de tiempo' }), (0, class_validator_1.IsString)()];
            _uploads_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número de uploads en el período' }), (0, class_validator_1.IsNumber)()];
            _totalSizeMB_decorators = [(0, swagger_1.ApiProperty)({ description: 'Tamaño total subido en MB' }), (0, class_validator_1.IsNumber)()];
            _averageFileSizeMB_decorators = [(0, swagger_1.ApiProperty)({ description: 'Tamaño promedio de archivo en MB' }), (0, class_validator_1.IsNumber)()];
            _filesByType_decorators = [(0, swagger_1.ApiProperty)({ description: 'Archivos agrupados por tipo en el período' }), (0, class_validator_1.IsObject)()];
            __esDecorate(null, null, _period_decorators, { kind: "field", name: "period", static: false, private: false, access: { has: function (obj) { return "period" in obj; }, get: function (obj) { return obj.period; }, set: function (obj, value) { obj.period = value; } }, metadata: _metadata }, _period_initializers, _period_extraInitializers);
            __esDecorate(null, null, _uploads_decorators, { kind: "field", name: "uploads", static: false, private: false, access: { has: function (obj) { return "uploads" in obj; }, get: function (obj) { return obj.uploads; }, set: function (obj, value) { obj.uploads = value; } }, metadata: _metadata }, _uploads_initializers, _uploads_extraInitializers);
            __esDecorate(null, null, _totalSizeMB_decorators, { kind: "field", name: "totalSizeMB", static: false, private: false, access: { has: function (obj) { return "totalSizeMB" in obj; }, get: function (obj) { return obj.totalSizeMB; }, set: function (obj, value) { obj.totalSizeMB = value; } }, metadata: _metadata }, _totalSizeMB_initializers, _totalSizeMB_extraInitializers);
            __esDecorate(null, null, _averageFileSizeMB_decorators, { kind: "field", name: "averageFileSizeMB", static: false, private: false, access: { has: function (obj) { return "averageFileSizeMB" in obj; }, get: function (obj) { return obj.averageFileSizeMB; }, set: function (obj, value) { obj.averageFileSizeMB = value; } }, metadata: _metadata }, _averageFileSizeMB_initializers, _averageFileSizeMB_extraInitializers);
            __esDecorate(null, null, _filesByType_decorators, { kind: "field", name: "filesByType", static: false, private: false, access: { has: function (obj) { return "filesByType" in obj; }, get: function (obj) { return obj.filesByType; }, set: function (obj, value) { obj.filesByType = value; } }, metadata: _metadata }, _filesByType_initializers, _filesByType_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UsageStatsByPeriodDto = UsageStatsByPeriodDto;
var AnalyticsHealthDto = function () {
    var _a;
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _timestamp_decorators;
    var _timestamp_initializers = [];
    var _timestamp_extraInitializers = [];
    var _activeAlerts_decorators;
    var _activeAlerts_initializers = [];
    var _activeAlerts_extraInitializers = [];
    var _totalUsers_decorators;
    var _totalUsers_initializers = [];
    var _totalUsers_extraInitializers = [];
    var _message_decorators;
    var _message_initializers = [];
    var _message_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AnalyticsHealthDto() {
                this.status = __runInitializers(this, _status_initializers, void 0);
                this.timestamp = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _timestamp_initializers, void 0));
                this.activeAlerts = (__runInitializers(this, _timestamp_extraInitializers), __runInitializers(this, _activeAlerts_initializers, void 0));
                this.totalUsers = (__runInitializers(this, _activeAlerts_extraInitializers), __runInitializers(this, _totalUsers_initializers, void 0));
                this.message = (__runInitializers(this, _totalUsers_extraInitializers), __runInitializers(this, _message_initializers, void 0));
                __runInitializers(this, _message_extraInitializers);
            }
            return AnalyticsHealthDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _status_decorators = [(0, swagger_1.ApiProperty)({
                    description: 'Estado de salud del sistema',
                    enum: ['healthy', 'degraded', 'unhealthy'],
                }), (0, class_validator_1.IsEnum)(['healthy', 'degraded', 'unhealthy'])];
            _timestamp_decorators = [(0, swagger_1.ApiProperty)({ description: 'Timestamp del check de salud' }), (0, class_validator_1.IsDateString)()];
            _activeAlerts_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número de alertas activas' }), (0, class_validator_1.IsNumber)()];
            _totalUsers_decorators = [(0, swagger_1.ApiProperty)({ description: 'Número total de usuarios' }), (0, class_validator_1.IsNumber)()];
            _message_decorators = [(0, swagger_1.ApiProperty)({ description: 'Mensaje descriptivo del estado' }), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _timestamp_decorators, { kind: "field", name: "timestamp", static: false, private: false, access: { has: function (obj) { return "timestamp" in obj; }, get: function (obj) { return obj.timestamp; }, set: function (obj, value) { obj.timestamp = value; } }, metadata: _metadata }, _timestamp_initializers, _timestamp_extraInitializers);
            __esDecorate(null, null, _activeAlerts_decorators, { kind: "field", name: "activeAlerts", static: false, private: false, access: { has: function (obj) { return "activeAlerts" in obj; }, get: function (obj) { return obj.activeAlerts; }, set: function (obj, value) { obj.activeAlerts = value; } }, metadata: _metadata }, _activeAlerts_initializers, _activeAlerts_extraInitializers);
            __esDecorate(null, null, _totalUsers_decorators, { kind: "field", name: "totalUsers", static: false, private: false, access: { has: function (obj) { return "totalUsers" in obj; }, get: function (obj) { return obj.totalUsers; }, set: function (obj, value) { obj.totalUsers = value; } }, metadata: _metadata }, _totalUsers_initializers, _totalUsers_extraInitializers);
            __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: function (obj) { return "message" in obj; }, get: function (obj) { return obj.message; }, set: function (obj, value) { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AnalyticsHealthDto = AnalyticsHealthDto;
