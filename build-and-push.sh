#!/bin/bash

# 🐳 Script para construir y subir imagen Docker a Docker Hub
# Uso: chmod +x build-and-push.sh && ./build-and-push.sh

set -e  # Parar si hay errores

echo "🚀 Iniciando proceso de build y push a Docker Hub..."

# Verificar que estamos en el directorio correcto
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: No se encontró Dockerfile en el directorio actual"
    echo "Asegúrate de estar en la raíz del proyecto"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json en el directorio actual"
    exit 1
fi

echo "✅ Archivos encontrados correctamente"

# Variables
IMAGE_NAME="alexzafra13/foro-api"
TAG="latest"
FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

echo "📦 Construyendo imagen: $FULL_IMAGE_NAME"

# Construir imagen
docker build -t $FULL_IMAGE_NAME . || {
    echo "❌ Error al construir la imagen"
    exit 1
}

echo "✅ Imagen construida exitosamente"

# Listar la imagen creada
echo "📋 Imagen creada:"
docker images | grep foro-api

# Preguntar si se quiere probar localmente
read -p "🧪 ¿Quieres probar la imagen localmente antes de subirla? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Probando imagen localmente..."
    
    # Ejecutar contenedor de prueba
    echo "Iniciando contenedor de prueba en puerto 3000..."
    CONTAINER_ID=$(docker run -d -p 3000:3000 \
        -e POSTGRES_URL="postgresql://test:test@localhost:5432/test" \
        -e JWT_SECRET="test_secret_for_local_test" \
        -e MAILER_EMAIL="test@localhost" \
        -e MAILER_SECRET_KEY="test_key" \
        $FULL_IMAGE_NAME)
    
    echo "Contenedor iniciado: $CONTAINER_ID"
    
    # Esperar un poco para que inicie
    sleep 5
    
    # Probar health check
    echo "Probando health check..."
    if curl -f http://localhost:3000/health; then
        echo "✅ Imagen funciona correctamente"
    else
        echo "⚠️ La imagen podría tener problemas, pero continuaremos"
    fi
    
    # Limpiar contenedor de prueba
    docker stop $CONTAINER_ID > /dev/null
    docker rm $CONTAINER_ID > /dev/null
    echo "🧹 Contenedor de prueba limpiado"
fi

# Verificar login en Docker Hub
echo "🔐 Verificando login en Docker Hub..."
if ! docker info | grep -q "Username"; then
    echo "🔑 Iniciando sesión en Docker Hub..."
    docker login || {
        echo "❌ Error al iniciar sesión en Docker Hub"
        exit 1
    }
fi

echo "✅ Sesión en Docker Hub activa"

# Subir imagen
echo "⬆️ Subiendo imagen a Docker Hub..."
docker push $FULL_IMAGE_NAME || {
    echo "❌ Error al subir la imagen"
    exit 1
}

echo "🎉 ¡Imagen subida exitosamente a Docker Hub!"
echo "🌐 Disponible en: https://hub.docker.com/r/$IMAGE_NAME"

# Información adicional
echo ""
echo "📋 Próximos pasos recomendados:"
echo "1. Ve a https://hub.docker.com/r/$IMAGE_NAME"
echo "2. Actualiza la descripción del repositorio"
echo "3. Agrega tags adicionales si es necesario"
echo "4. Prueba la instalación desde cero:"
echo "   curl -o docker-compose.yml https://raw.githubusercontent.com/alexzafra13/foro/main/docker-compose.standalone.yml"
echo "   docker-compose up -d"

echo "✅ Proceso completado exitosamente"