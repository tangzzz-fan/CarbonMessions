import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 全局验证管道
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // 配置CORS
    app.enableCors();

    // 配置Swagger API文档
    const config = new DocumentBuilder()
        .setTitle('碳排放预测管理系统API')
        .setDescription('物流园区碳排放预测和管理系统的API文档')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    // 获取配置服务
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    await app.listen(port);
    console.log(`应用已启动，访问地址: http://localhost:${port}`);
    console.log(`API文档地址: http://localhost:${port}/api-docs`);
}
bootstrap(); 