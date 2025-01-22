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

  return { sceneId, imageUrl };
}

/**
 * loadScene:
 * Carrega a cena pelo sceneId no elemento #viewer.
 */
function loadScene(sceneId) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig) {
    notyf.error("No se pudo cargar la escena.");
    return;
  }

  // Limpia el contenido del visor
  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = ""; // Elimina todos los elementos DOM antiguos

  // Reinstancia el visor con la configuración de la escena seleccionada
  tourViewer = pannellum.viewer("viewer", sceneConfig);
}


/**
 * Função para criar o hotspot em uma cena (no drop).
 * Conserva o pitch/yaw atuais e recria o viewer.
 */
function addHotspotToScene(sceneId, hotspot) {
  const sceneConfig = tourConfig.scenes[sceneId];
  if (!sceneConfig) return;

  // Verifica si ya existe un hotspot con las mismas coordenadas
  const existe = sceneConfig.hotSpots.find(
    hs => hs.pitch === hotspot.pitch && hs.yaw === hotspot.yaw
  );
  if (existe) {
    notyf.error("Ya existe un hotspot en esta posición.");
    return false;
  }

  // Agrega el nuevo hotspot
  sceneConfig.hotSpots.push(hotspot);

  // Limpia y reinicia el visor con la configuración completa del tourConfig
  const currentPitch = tourViewer.getPitch();
  const currentYaw = tourViewer.getYaw();

  const viewerElement = document.getElementById("viewer");
  viewerElement.innerHTML = ""; // Limpia el visor

  tourViewer = pannellum.viewer("viewer", {
    default: tourConfig.default,   // Configuración predeterminada
    scenes: tourConfig.scenes,     // Todas las escenas con los nuevos hotspots
    pitch: currentPitch,           // Mantener posición actual
    yaw: currentYaw
  });

  return true;
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
        message: "Por favor, selecciona un archivo de imagen válido (.jpg, .png).",
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
      // Em vez de salvar a blobURL, salvamos o sceneId (para criar hotspot entre cenas)
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

      // (Opcional) Poderia remover a cena do tourConfig, se desejar
      if (tourConfig.scenes[sceneId]) {
        delete tourConfig.scenes[sceneId];
      }

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
    nameInput.maxLength = 12;

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

    // Pega o sceneId que está sendo arrastado
    const droppedSceneId = event.dataTransfer.getData("sceneId");
    if (!droppedSceneId) return;

    // Obter posição atual do viewer
    const currentPitch = tourViewer.getPitch();
    const currentYaw = tourViewer.getYaw();

    // Pegar a cena atualmente carregada
    // Precisamos descobrir qual sceneId está sendo exibido no momento
    // Se você quiser manter isso, pode armazenar num global "activeSceneId" ao chamar loadScene
    // Aqui, assumindo que o viewer possui 'config.sceneId' (não nativo do Pannellum, mas podemos trackear)
    // Vamos tentar descobrir varrendo as scenes:
    let activeSceneId = null;
    for (const sid in tourConfig.scenes) {
      // Comparar se o panorama do viewer bate com o panorama de cada scene
      // ou manter global ao chamar loadScene(sid).
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

    // Cria hotspot do tipo 'scene' apontando para droppedSceneId
    const newHotspot = {
      pitch,
      yaw,
      type: "scene",
      text: "Ir a otra escena",
      sceneId: droppedSceneId
    };

    // Adiciona o hotspot na cena atualmente ativa
    const ok = addHotspotToScene(activeSceneId, newHotspot);
    if (!ok) return; // Se já existia, paramos

    // Recarrega o viewer (para atualizar o hotspot) mantendo pitch/yaw
    const activeSceneConfig = tourConfig.scenes[activeSceneId];
    document.getElementById("viewer").innerHTML = "";

    tourViewer = pannellum.viewer("viewer", {
      ...activeSceneConfig,
      pitch: currentPitch,
      yaw: currentYaw
    });
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

    // Ajusta o autor do tour para o nome do projeto
    tourConfig.default.author = projectName;

    // Pasta/projeto
    formData.append("folderName", folderName);

    // Adiciona as imagens
    uploadedImages.forEach(file => {
      formData.append("image", file);
    });

    // Adiciona tourConfig completo
    formData.append("tourConfig", JSON.stringify(tourConfig));

    // Fetch ao backend
    fetch("/save-image", {
      method: "POST",
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          notyf.success("¡Proyecto guardado exitosamente!");
          projectNameElement.innerHTML = `<a href="${data.viewer_url}" target="_blank">${projectName}</a>`;
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
    notyf.error("No hay ninguna imagen cargada.");
    return;
  }

  // Obtén los valores actuales del visor
  const currentPitch = tourViewer.getPitch();
  const currentYaw = tourViewer.getYaw();
  const currentHfov = tourViewer.getHfov(); // Zoom actual

  // Encuentra la escena activa
  let activeSceneId = null;
  for (const sceneId in tourConfig.scenes) {
    if (tourViewer.getConfig().panorama === tourConfig.scenes[sceneId].panorama) {
      activeSceneId = sceneId;
      break;
    }
  }

  if (!activeSceneId) {
    notyf.error("No se pudo identificar la escena activa.");
    return;
  }

  // Actualiza los valores en la configuración de la escena activa
  const sceneConfig = tourConfig.scenes[activeSceneId];
  sceneConfig.pitch = currentPitch; // Guarda el pitch
  sceneConfig.yaw = currentYaw;     // Guarda el yaw
  sceneConfig.hfov = currentHfov;   // Guarda el zoom

  notyf.success("¡Ángulo y zoom actualizados!");

  // Opcional: recargar la escena para reflejar los cambios inmediatamente
  tourViewer = pannellum.viewer("viewer", sceneConfig);
});
