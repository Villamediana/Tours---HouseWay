let uploadedImages = [];
const notyf = new Notyf();

// Instância global do viewer Pannellum
let tourViewer = null;

/**
 * tourConfig: Configuração geral do tour,
 * contendo a cena padrão e um objeto "scenes" para cada cena.
 */
let tourConfig = {
  default: {
    firstScene: "",
    author: "",
    sceneFadeDuration: 1000
  },
  scenes: {}
};

// Contador para gerar IDs de cena
let sceneCounter = 0;

/**
 * createScene:
 * Cria uma nova cena no tourConfig usando o arquivo (imageFile)
 * Retorna { sceneId, imageUrl } para uso posterior (thumbnail, etc.)
 */
function createScene(file) {
  const sceneId = "scene-" + (++sceneCounter);
  const imageUrl = URL.createObjectURL(file);

  const sceneConfig = {
    type: "equirectangular",
    panorama: imageUrl,
    autoLoad: true,
    showControls: true,
    autoRotate: 0,
    hotSpotDebug: true,
    hfov: 120,
    hotSpots: []
  };

  tourConfig.scenes[sceneId] = sceneConfig;

  // Se não temos uma cena inicial definida ainda, define esta como padrão
  if (!tourConfig.default.firstScene) {
    tourConfig.default.firstScene = sceneId;
  }

  // Actualizar la cantidad de imágenes en el servidor
  updateMetadataJson("images", Object.keys(tourConfig.scenes).length);

  return { sceneId, imageUrl };
}

// Agregar esta función en main.js
/**
 * updateMetadataJson:
 * Actualiza los campos 'images' y 'hotspots' en el metadata.json del proyecto.
 * @param {String} projectName - Nombre del proyecto.
 * @param {Number} imagesCount - Cantidad de imágenes.
 * @param {Number} hotspotsCount - Cantidad de hotspots.
 */
function updateMetadataJson(projectName, imagesCount, hotspotsCount) {
  fetch('/api/update-metadata', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          projectName: PROJECT_NAME,
          images: imagesCount,
          hotspots: hotspotsCount,
      }),
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          console.log(`Metadata para el proyecto "${projectName}" actualizada correctamente.`);
      } else {
          console.error('Error al actualizar metadata:', data.message);
      }
  })
  .catch(error => {
      console.error('Error al enviar la actualización del metadata:', error);
  });
}




/**
 * loadScene:
 * Carrega a cena pelo sceneId no elemento #viewer.
 */
function loadScene(sceneId) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig) {
    notyf.error("Não foi possível carregar a cena.");
    return;
  }

  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = ""; // Limpia el visor

  // Cargar el visor con la escena seleccionada
  tourViewer = pannellum.viewer("viewer", {
    ...tourConfig, // Pasa toda la configuración del tour
    default: tourConfig.default,
    firstScene: sceneId // Establece la escena actual
  });

  // Asegúrate de que cada hotspot tenga funcionalidad
  const currentSceneHotspots = tourConfig.scenes[sceneId].hotSpots || [];
  currentSceneHotspots.forEach(hotspot => {
    if (hotspot.type === "scene") {
      hotspot.createTooltipFunc = function(hotSpotDiv) {
        // Aplicar clase CSS personalizada si está definida
        if (hotspot.cssClass) {
          hotSpotDiv.classList.add(hotspot.cssClass);
        } else {
          hotSpotDiv.classList.add("default-tooltip"); // Clase por defecto si no hay personalizada
        }

        hotSpotDiv.innerHTML = hotspot.text;
        hotSpotDiv.style.cursor = "pointer";

        // Configura el evento de clic para navegar
        hotSpotDiv.addEventListener("click", function() {
          loadScene(hotspot.sceneId);
        });
      };
    }
  });

  // Recarga los hotspots para reflejar los cambios
  addDraggableHotspots(sceneId);
}






function addHotspotToScene(sceneId, hotspot) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig) return;

  // Asegúrate de que el hotspot tiene un identificador único
  hotspot.id = `hotspot-${Date.now()}`;

  // Verifica si ya existe un hotspot con las mismas coordenadas
  const existe = sceneConfig.hotSpots.find(
    hs => hs.pitch === hotspot.pitch && hs.yaw === hotspot.yaw
  );
  if (existe) {
    notyf.error("Já existe um hotspot nesta posição.");
    return false;
  }

  // Configuración de createTooltipFunc para que el hotspot tenga funcionalidad
  hotspot.createTooltipFunc = function(hotSpotDiv) {
    hotSpotDiv.classList.add("custom-tooltip");
    hotSpotDiv.innerHTML = hotspot.text;
    hotSpotDiv.style.cursor = "pointer";

    // Configura el evento de clic para navegar entre escenas
    hotSpotDiv.addEventListener("click", function() {
      loadScene(hotspot.sceneId);
    });
  };

  // Agrega el nuevo hotspot
  sceneConfig.hotSpots.push(hotspot);

  // Actualizar la cantidad total de hotspots en el servidor
  const totalHotspots = Object.values(tourConfig.scenes).reduce(
    (sum, scene) => sum + (scene.hotSpots?.length || 0),
    0
  );
  updateMetadataJson("hotspots", totalHotspots);

  // Cambia el borde del thumbnail correspondiente
  const thumbnailWrapper = document.querySelector(`[data-scene-id="${sceneId}"]`);
  if (thumbnailWrapper) {
    thumbnailWrapper.style.border = "4px solid #80cdd9"; // Cambia el borde a verde
  }

  // Guarda el estado actual del visor
  const currentPitch = tourViewer?.getPitch() || 0;
  const currentYaw = tourViewer?.getYaw() || 0;
  const currentHfov = tourViewer?.getHfov() || 120; // Zoom actual

  // Limpia y reinicia el visor con el estado actual y la nueva configuración
  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = ""; // Limpia el visor

  tourViewer = pannellum.viewer("viewer", {
    ...tourConfig, // Pasa todo el tourConfig para mantener las escenas conectadas
    default: tourConfig.default,
    firstScene: sceneId, // Mantén la escena activa
    pitch: currentPitch, // Mantén el pitch actual
    yaw: currentYaw,     // Mantén el yaw actual
    hfov: currentHfov    // Mantén el zoom actual
  });

  // Asegurar que todos los hotspots sean `draggable`, incluidos los nuevos
  addDraggableHotspots(sceneId);

  // Evento de clic derecho para eliminar hotspots
  viewerElement.addEventListener("contextmenu", event => {
    event.preventDefault();
    const coords = tourViewer.mouseEventToCoords(event);

    // Encuentra el hotspot en esas coordenadas
    const hotspot = sceneConfig.hotSpots.find(
      hs => Math.abs(hs.pitch - coords[0]) < 1 && Math.abs(hs.yaw - coords[1]) < 1
    );

    if (hotspot) {
      if (confirm(`Você quer remover o "${hotspot.text}"?`)) {
        removeHotspot(sceneId, hotspot.id);
        // Restaurar el borde del thumbnail al eliminar un hotspot
        if (!sceneConfig.hotSpots.length) {
          thumbnailWrapper.style.border = "4px solid #80cdd9"; // Borde original
        }
      }
    }
  });

  return true;
}



function addDraggableHotspots(sceneId) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig || !sceneConfig.hotSpots) return;

  sceneConfig.hotSpots.forEach(hotspot => {
    hotspot.createTooltipFunc = function(hotSpotDiv) {
      hotSpotDiv.setAttribute("draggable", true);

      // Manejar inicio del arrastre
      hotSpotDiv.addEventListener("dragstart", function(event) {
        event.dataTransfer.setData("hotspotId", hotspot.id);
        event.dataTransfer.setData("sceneId", sceneId);
      });

      hotSpotDiv.style.cursor = "grab";
    };
  });

  // Forzar la recarga para aplicar las funciones `createTooltipFunc`
  const currentPitch = tourViewer.getPitch();
  const currentYaw = tourViewer.getYaw();
  const currentHfov = tourViewer.getHfov();

  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = "";

  tourViewer = pannellum.viewer("viewer", {
    ...sceneConfig,
    pitch: currentPitch,
    yaw: currentYaw,
    hfov: currentHfov
  });
}



function removeHotspot(sceneId, hotspotId) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig) return;

  // Filtra los hotspots y elimina el que coincida con el ID
  sceneConfig.hotSpots = sceneConfig.hotSpots.filter(hotspot => hotspot.id !== hotspotId);

  // Actualizar la cantidad total de hotspots en el servidor
  const totalHotspots = Object.values(tourConfig.scenes).reduce(
    (sum, scene) => sum + (scene.hotSpots?.length || 0),
    0
  );
  updateMetadataJson("hotspots", totalHotspots);

  // Obtén los valores actuales del visor
  const currentPitch = tourViewer.getPitch();
  const currentYaw = tourViewer.getYaw();
  const currentHfov = tourViewer.getHfov(); // Zoom actual

  // Limpia solo el visor, no la configuración global
  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = "";

  // Recarga solo la escena actual con los valores actuales
  tourViewer = pannellum.viewer("viewer", {
    ...sceneConfig,       // Configuración actualizada de la escena
    pitch: currentPitch,  // Mantén el pitch actual
    yaw: currentYaw,      // Mantén el yaw actual
    hfov: currentHfov     // Mantén el zoom actual
  });
}



function addDraggableHotspots(sceneId) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig || !sceneConfig.hotSpots) return;

  sceneConfig.hotSpots.forEach(hotspot => {
    hotspot.createTooltipFunc = function(hotSpotDiv) {
      hotSpotDiv.setAttribute("draggable", true);

      // Manejar inicio del arrastre
      hotSpotDiv.addEventListener("dragstart", function(event) {
        event.dataTransfer.setData("hotspotId", hotspot.id);
        event.dataTransfer.setData("sceneId", sceneId);
      });

      hotSpotDiv.style.cursor = "grab";
    };
  });
}





document.addEventListener("DOMContentLoaded", () => {

  const validExtensions = ["image/jpeg", "image/png"];
  const thumbnailContainer = document.getElementById("thumbnail-container");
  let thumbnailIdCounter = 0;

  // Upload de imagem
  document.getElementById("uploadImage").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar extensão
    if (!validExtensions.includes(file.type)) {
      notyf.open({
        type: "info",
        message: "Por favor, selecione um arquivo de imagem válido (.jpg, .png).",
        duration: 4000,
        background: "#F3C959",
        dismissible: true
      });
      event.target.value = "";
      return;
    }

    // Validar proporção 2:1 (checando width/height)
    const img = new Image();
    img.onload = function () {
      if (img.width / img.height === 2) {
        // Criar cena nova
        const { sceneId, imageUrl } = createScene(file);

        // Criar miniatura
        addThumbnail(sceneId, imageUrl);

        // Carregar essa cena no viewer
        loadScene(sceneId);

        // Guardar arquivo (para upload posterior)
        uploadedImages.push(file);

        document.getElementById("placeholder-text").style.display = "none";
        toggleSearchBar();
      } else {
        notyf.open({
          type: "info",
          message: "Por favor, selecciona una imagen 360° con proporción 2:1.",
          duration: 4000,
          background: "#F3C959",
          dismissible: true
        });
        event.target.value = "";
      }
    };
    img.src = URL.createObjectURL(file);
  });

  /**
   * addThumbnail:
   * Cria a miniatura, a torna arrastável e associa eventos de clique/arraste.
   * Recebe o sceneId e a URL blob para exibir no <img>.
   */
  function addThumbnail(sceneId, imageUrl) {
    const thumbnailWrapper = document.createElement("div");
    thumbnailWrapper.classList.add("thumbnail-wrapper");
    thumbnailWrapper.id = "thumbnail-" + thumbnailIdCounter++;
  
    // Armazena o sceneId no data-attribute
    thumbnailWrapper.dataset.sceneId = sceneId;
  
    // Torna a miniatura arrastável
    thumbnailWrapper.setAttribute("draggable", true);
    thumbnailWrapper.addEventListener("dragstart", event => {
      event.dataTransfer.setData("sceneId", sceneId);
    });
  
    // Imagem de miniatura
    const imgThumbnail = document.createElement("img");
    imgThumbnail.src = imageUrl;
    imgThumbnail.classList.add("thumbnail");
  
    // Ao clicar na miniatura, carrega a cena
    imgThumbnail.addEventListener("click", function () {
      loadScene(sceneId);
    });
  
    // Botão para excluir
    const actionButtons = document.createElement("div");
    actionButtons.classList.add("action-buttons");
  
    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = "✖";
    deleteButton.addEventListener("click", function (e) {
      e.stopPropagation();
  
      // Remove do array uploadedImages com base no índice do DOM
      const index = Array.from(thumbnailWrapper.parentNode.children).indexOf(thumbnailWrapper);
      uploadedImages.splice(index, 1);
  
      // Remove o thumbnail
      thumbnailWrapper.remove();
  
      // Remove a cena do tourConfig
      if (tourConfig.scenes[sceneId]) {
        delete tourConfig.scenes[sceneId];
      }
  
      // Atualizar a quantidade de imagens no servidor
      updateMetadataJson("images", Object.keys(tourConfig.scenes).length);
  
      updateOrderNumbers();
      checkEmptyThumbnails();
    });
    actionButtons.appendChild(deleteButton);
  
    // Detalhes: ordem + nome
    const detailsContainer = document.createElement("div");
    detailsContainer.classList.add("thumbnail-details");
  
    const orderNumber = document.createElement("span");
    orderNumber.classList.add("order-number");
    orderNumber.textContent = thumbnailContainer.children.length + 1;
  
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Ambiente";
    nameInput.classList.add("name-input");
    nameInput.maxLength = 20;
  
    // Atualiza o nome da cena quando o usuário digita no input
    nameInput.addEventListener("input", function () {
      tourConfig.scenes[sceneId].name = nameInput.value || "Ambiente sem nome";
    });
  
    detailsContainer.appendChild(orderNumber);
    detailsContainer.appendChild(nameInput);
  
    // Monta tudo
    thumbnailWrapper.appendChild(imgThumbnail);
    thumbnailWrapper.appendChild(actionButtons);
    thumbnailWrapper.appendChild(detailsContainer);
    thumbnailContainer.appendChild(thumbnailWrapper);
  
    toggleSearchBar();
  }
    

  function checkEmptyThumbnails() {
    if (thumbnailContainer.children.length === 0) {
      document.getElementById("placeholder-text").style.display = "block";
      resetViewer();
      toggleSearchBar();
    }
  }

  function resetViewer() {
    // Exibe texto placeholder e pode limpar o viewer
    document.getElementById("placeholder-text").style.display = "block";
    document.getElementById("viewer").innerHTML = "";
    tourViewer = null;
  }

  function updateOrderNumbers() {
    const wrappers = document.querySelectorAll(".thumbnail-wrapper .order-number");
    wrappers.forEach((orderNumber, index) => {
      orderNumber.textContent = index + 1;
    });
  }

  function toggleSearchBar() {
    const searchBar = document.getElementById("searchBar");
    const thumbnails = document.querySelectorAll(".thumbnail-wrapper");
    searchBar.disabled = (thumbnails.length === 0);
  }

  // Drag & drop no contêiner do viewer
  const viewerElement = document.getElementById("viewer");
  
  viewerElement.addEventListener("dragover", event => {
    event.preventDefault(); // Permite soltar
  });
  
  viewerElement.addEventListener("drop", event => {
    event.preventDefault();
    if (!tourViewer) return;
  
    // Obtener el sceneId de la escena actual
    let activeSceneId = null;
    for (const sid in tourConfig.scenes) {
      if (tourViewer && tourViewer.getConfig().panorama === tourConfig.scenes[sid].panorama) {
        activeSceneId = sid;
        break;
      }
    }
    if (!activeSceneId) return;
  
    // Usa API do Pannellum para coordenadas do clique
    const coords = tourViewer.mouseEventToCoords(event);
    if (!coords) return;
  
    const pitch = coords[0];
    const yaw = coords[1];
  
    // Detectar si el drop corresponde a un hotspot existente o uno nuevo
    const hotspotId = event.dataTransfer.getData("hotspotId"); // Verificar si es un hotspot arrastrado
    if (hotspotId) {
      // Mover un hotspot existente
      const sceneConfig = tourConfig.scenes[activeSceneId];
      const hotspot = sceneConfig.hotSpots.find(hs => hs.id === hotspotId);
      if (hotspot) {
        hotspot.pitch = pitch;
        hotspot.yaw = yaw;
  
        // Recargar la escena para reflejar los cambios
        const currentPitch = tourViewer.getPitch();
        const currentYaw = tourViewer.getYaw();
        const currentHfov = tourViewer.getHfov();
  
        document.getElementById("viewer").innerHTML = ""; // Limpiar visor
  
        tourViewer = pannellum.viewer("viewer", {
          ...sceneConfig,
          pitch: currentPitch,
          yaw: currentYaw,
          hfov: currentHfov
        });

      }
    } else {
      // Crear un nuevo hotspot
      const droppedSceneId = event.dataTransfer.getData("sceneId");
      if (!droppedSceneId) return;
  
      const droppedSceneName = tourConfig.scenes[droppedSceneId]?.name || "outra cena"; // Obtener el nombre de la escena
      const newHotspot = {
        id: `hotspot-${Date.now()}`, // ID único
        pitch,
        yaw,
        type: "scene",
        text: `Ir a ${droppedSceneName}`, // Incluye el nombre de la escena
        sceneId: droppedSceneId
      };
  
      const ok = addHotspotToScene(activeSceneId, newHotspot);
      if (!ok) return; // Si ya existía, paramos
    }
  });
  

  // Menu do footer
  const menuItems = document.querySelectorAll("#menu ul li");
  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      menuItems.forEach(el => el.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Buscador de ambientes
  document.getElementById("searchBar").addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    const thumbnails = document.querySelectorAll(".thumbnail-wrapper");

    thumbnails.forEach(thumbnail => {
      const nameInput = thumbnail.querySelector(".name-input").value.toLowerCase();
      thumbnail.style.display = nameInput.includes(searchTerm) ? "" : "none";
    });
  });

  // Botão de salvar: envia ao backend
  document.getElementById("save").addEventListener("click", function () {
    const formData = new FormData();
    const projectNameElement = document.getElementById("project-name");
    const projectName = projectNameElement.textContent.trim();
    const folderName = projectName;

    // Ajusta el autor del tour al nombre del proyecto
    tourConfig.default.author = projectName;

    // Agrega la carpeta/proyecto al FormData
    formData.append("folderName", folderName);

    // Agrega las imágenes al FormData
    uploadedImages.forEach(file => {
        formData.append("image", file);
    });

    // Agrega el tourConfig completo al FormData
    formData.append("tourConfig", JSON.stringify(tourConfig));

    // Realiza la solicitud al backend para guardar
    fetch("/save-image", {
        method: "POST",
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                notyf.success("Projeto salvo com sucesso!");
                projectNameElement.innerHTML = `<a href="${data.viewer_url}" target="_blank">${projectName}</a>`;

                if (navigator.clipboard && window.isSecureContext) {
                    // Copia la URL al portapapeles si es seguro hacerlo
                    navigator.clipboard.writeText(data.viewer_url)
                        .then(() => {
                            notyf.success("URL copiada para a área de transferência!");
                        })
                        .catch(err => {
                            console.error("Error al copiar al portapapeles:", err);
                            notyf.error("No fue posible copiar la URL al portapapeles.");
                        });
                }
            } else {
                notyf.error("Hubo un error al guardar el proyecto.");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            notyf.error("Hubo un error al guardar el proyecto.");
        });
});

});

// Botón para establecer el ángulo y el zoom actuales como predeterminados
document.getElementById("setAngleButton").addEventListener("click", () => {
  if (!tourViewer) {
    notyf.error("Não há nenhuma imagem carregada.");
    return;
  }

  // Obtén los valores actuales del visor
  const currentPitch = tourViewer.getPitch();
  const currentYaw = tourViewer.getYaw();
  const currentHfov = tourViewer.getHfov();

  // Encuentra la escena activa
  let activeSceneId = null;
  for (const sceneId in tourConfig.scenes) {
    if (tourViewer.getConfig().panorama === tourConfig.scenes[sceneId].panorama) {
      activeSceneId = sceneId;
      break;
    }
  }

  if (!activeSceneId) {
    notyf.error("Não foi possível identificar a cena ativa.");
    return;
  }

  // Actualiza los valores en la configuración de la escena activa
  const sceneConfig = tourConfig.scenes[activeSceneId];
  sceneConfig.pitch = currentPitch; // Guarda el pitch
  sceneConfig.yaw = currentYaw;     // Guarda el yaw
  sceneConfig.hfov = currentHfov;   // Guarda el zoom

  // Limpia el visor para evitar duplicaciones
  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = ""; // Limpia el visor completamente

  // Recarga el visor con la configuración actualizada
  tourViewer = pannellum.viewer("viewer", {
    ...tourConfig, // Pasa toda la configuración del tour
    default: tourConfig.default,
    firstScene: activeSceneId, // Mantén la escena activa
    pitch: currentPitch,       // Mantén el pitch actual
    yaw: currentYaw,           // Mantén el yaw actual
    hfov: currentHfov          // Mantén el zoom actual
  });

  notyf.success("Ângulo e zoom atualizados!");
});
