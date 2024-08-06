import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Box,
    Text,
    AspectRatio,
    Stack,
    Flex,
    Button,
    Fade,
    Skeleton
} from '@salesforce/retail-react-app/app/components/shared/ui';
import DynamicImage from '@salesforce/retail-react-app/app/components/dynamic-image';
import { useIntl } from 'react-intl';
import useEinstein from '@salesforce/retail-react-app/app/hooks/use-einstein';
import QuantityPicker from '@salesforce/retail-react-app/app/components/quantity-picker';
import ItemVariantProvider from '@salesforce/retail-react-app/app/components/item-variant';
import CartItemVariantAttributes from '@salesforce/retail-react-app/app/components/item-variant/item-attributes';
import { useCurrentBasket } from '../../hooks/use-current-basket';
import { useServerContext } from '@salesforce/pwa-kit-react-sdk/ssr/universal/hooks';
import {
    MAX_CACHE_AGE,
    TOAST_ACTION_VIEW_WISHLIST,
    TOAST_MESSAGE_ADDED_TO_WISHLIST,
    TOAST_MESSAGE_ALREADY_IN_WISHLIST
} from '@salesforce/retail-react-app/app/constants';
import withRegistration from '@salesforce/retail-react-app/app/components/with-registration';
import { useWishList } from '@salesforce/retail-react-app/app/hooks/use-wish-list';
import { useToast } from '@salesforce/retail-react-app/app/hooks/use-toast';
import {
    useProduct,
    useCategory,
    useShopperBasketsMutation,
    useShopperCustomersMutation,
    useCustomerId
} from '@salesforce/commerce-sdk-react';
import LoadingSpinner from '@salesforce/retail-react-app/app/components/loading-spinner';
import Swatch from '@salesforce/retail-react-app/app/components/swatch-group/swatch'
import SwatchGroup from '@salesforce/retail-react-app/app/components/swatch-group'
import { useHistory, useLocation, useParams } from 'react-router-dom';

const QuickView = ({ isOpen, onClose, product, productData }) => {
    const intl = useIntl();
    const { image, price, productId, productName, currency } = product;
    const [quantity, setQuantity] = useState(1);
    const [showLoading, setShowLoading] = useState(false);
    const [showInventoryMessage, setShowInventoryMessage] = useState(false);
    const [selectedSize, setSelectedSize] = useState(null);
    const inventoryMessage = "Limited stock available!";
    const einstein = useEinstein();
    const { formatMessage } = useIntl();
    const customerId = useCustomerId();
    const toast = useToast();
    const ButtonWithRegistration = withRegistration(Button);
    const location = useLocation();
    const [selected, setSelected] = useState(null);

    const { data: wishlist, isLoading: isWishlistLoading } = useWishList();
    const createCustomerProductListItem = useShopperCustomersMutation('createCustomerProductListItem');

    const { data: basket } = useCurrentBasket();
    const addItemToBasketMutation = useShopperBasketsMutation('addItemToBasket');
    const { res } = useServerContext();
    if (res) {
        res.set('Cache-Control', `s-maxage=${MAX_CACHE_AGE}`);
    }

    const handleAddToCart = async () => {
        if (!selectedSize) {
            toast({
                title: "Please select a size before adding to cart",
                status: 'warning'
            });
            return;
        }

        try {
            let itemList = [];
            const productItems = {
                productId: selectedSize,
                price: product.price,
                quantity: quantity
            };

            itemList.push(productItems);

            await addItemToBasketMutation.mutateAsync({
                parameters: { basketId: basket.basketId },
                body: itemList
            });

            einstein.sendAddToCart(productItems);

            return productSelectionValues;
        } catch (error) {
            showError(error);
        }
    };

    const getProductIdBySize = (sizeValue) => {
        const { variants } = productD;

        for (let variant of variants) {

            console.log("varients  :", productD, variant.variationValues.size, sizeValue)
            if (variant.variationValues.size === sizeValue) {
                return variant.productId;
            }
        }

        return null;
    }



    const { data: productD } = useProduct(
        {
            parameters: {
                id: product.representedProduct.id,
                allImages: true
            }
        },
        {
            keepPreviousData: true
        }
    );

    const handleAddToWishlist = (product, quantity) => {
        const isItemInWishlist = wishlist?.customerProductListItems?.find(
            (i) => i.productId === product.representedProduct.id
        );

        if (!isItemInWishlist) {
            createCustomerProductListItem.mutate(
                {
                    parameters: {
                        listId: wishlist.id,
                        customerId
                    },
                    body: {
                        quantity,
                        productId: product.representedProduct.id || null,
                        public: false,
                        priority: 1,
                        type: 'product'
                    }
                },
                {
                    onSuccess: () => {
                        toast({
                            title: formatMessage(TOAST_MESSAGE_ADDED_TO_WISHLIST, { quantity: 1 }),
                            status: 'success',
                            action: (
                                <Button
                                // variant="link"
                                // onClick={() => navigate('/account/wishlist')}
                                >
                                    {formatMessage(TOAST_ACTION_VIEW_WISHLIST)}
                                </Button>
                            )
                        });
                    },
                    onError: () => {
                        showError();
                    }
                }
            );
        } else {
            toast({
                title: formatMessage(TOAST_MESSAGE_ALREADY_IN_WISHLIST),
                status: 'info',
                action: (
                    <Button>
                        {formatMessage(TOAST_ACTION_VIEW_WISHLIST)}
                    </Button>
                )
            });
        }
    };

    const valueFunction = (arg) => {
        console.log("Found:", productD?.variationAttributes[1].values, arg);
        const found = productD?.variationAttributes[1]?.values.find((val) => val.name === arg);

        if (found) {
            console.log("Found:", found);
            return found.value;
        }

        console.log("No match found");
        return null;
    };


    const handleClick = async (e) => {
        const val = await valueFunction(e);
        const data = await getProductIdBySize(val);
        setSelectedSize(data);
        console.log("valueee : ", data)
    }

    const handleSizeChart = () => {
        // Implement size chart modal or popover
        toast({
            title: "Size Chart",
            description: "Size chart functionality is under development.",
            status: 'info'
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{productName}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <ItemVariantProvider variant={product}>
                        {showLoading && <LoadingSpinner />}
                        <Flex direction={{ base: 'column', md: 'row' }} alignItems="flex-start">
                            <AspectRatio ratio={1} width={['100%', '50%']} mr={4}>
                                <DynamicImage
                                    src={`${image.disBaseLink || image.link}[?sw={width}&q=60]`}
                                    imageProps={{
                                        alt: image.alt
                                    }}
                                />
                            </AspectRatio>
                            <Stack spacing={4} flex={1}>
                                <Text fontWeight="medium" color="gray.700">
                                    {productD?.shortDescription}
                                </Text>
                                <CartItemVariantAttributes />
                                <Text fontSize="xl" fontWeight="bold" >
                                    {intl.formatNumber(price, {
                                        style: 'currency',
                                        currency: currency
                                    })}
                                </Text>
                                <Flex direction={{ base: 'column', md: 'row' }} alignItems="center" flexWrap="wrap">
                                    {productD?.variationAttributes?.map(({ id, name, selectedValue, values }) => {
                                        const swatches = values?.map(({ href, name, image, value, orderable }, index) => {
                                            const content = image ? (
                                                <Box
                                                    height="100%"
                                                    width="100%"
                                                    minWidth="32px"
                                                    backgroundRepeat="no-repeat"
                                                    backgroundSize="cover"
                                                    backgroundColor={name.toLowerCase()}
                                                    backgroundImage={`url(${image.disBaseLink || image.link})`}
                                                />
                                            ) : (
                                                name
                                            );

                                            const isSelected = selectedValue === value;
                                            const isFocusable = isSelected || (!selectedValue && index === 0);

                                            return (

                                                <div
                                                    onClick={(event) => {
                                                        let target = event.target;
                                                        while (target && target !== event.currentTarget) {  // Log the element being checked
                                                            if (target.getAttribute('aria-label')) {
                                                                break;
                                                            }
                                                            target = target.parentElement;
                                                        }

                                                        const ariaLabelValue = target ? target.getAttribute('aria-label') : null;
                                                        handleClick(ariaLabelValue);
                                                    }}
                                                >
                                                    <Swatch
                                                        key={value}
                                                        href={href}
                                                        disabled={!orderable}
                                                        value={value}
                                                        name={name}
                                                        variant={id === 'color' ? 'circle' : 'square'}
                                                        selected={selectedValue === value}
                                                        isFocusable={isFocusable}
                                                        aria-label={name}
                                                    >
                                                        {content}
                                                    </Swatch>

                                                </div>
                                            );
                                        });

                                        return (
                                            <SwatchGroup
                                                key={id}
                                                value={selectedValue}
                                                displayName={selectedValue}
                                                label={`Select ${name}`}
                                            >
                                                {swatches}
                                            </SwatchGroup>
                                        );
                                    })}
                                </Flex>
                                <QuantityPicker
                                    step={1}
                                    value={quantity}
                                    min={0}
                                    onChange={(stringValue, numberValue) => {
                                        if (numberValue >= 0) {
                                            setQuantity(numberValue);
                                        }
                                    }}
                                />
                                <Flex alignItems="stretch" justifyContent="space-between">
                                    <Button
                                        onClick={() => handleAddToCart()}
                                        flex="1"
                                        mr={2}
                                        bg="blue.500"
                                        color="white"
                                        _hover={{ bg: "blue.600" }}
                                        _active={{ bg: "blue.700" }}
                                        borderRadius="md"
                                    >
                                        Add to Cart
                                    </Button>
                                    <ButtonWithRegistration
                                        onClick={() => handleAddToWishlist(product, quantity)}
                                        flex="1"
                                        variant="outline"
                                        borderColor="blue.500"
                                        color="blue.500"
                                        _hover={{ bg: "blue.50" }}
                                        _active={{ bg: "blue.100" }}
                                        borderRadius="md"
                                    >
                                        Add to Wishlist
                                    </ButtonWithRegistration>
                                </Flex>
                                {product && showInventoryMessage && (
                                    <Fade in={true}>
                                        <Text color="orange.600" fontWeight={600} mt={2}>
                                            {inventoryMessage}
                                        </Text>
                                    </Fade>
                                )}
                            </Stack>
                        </Flex>
                    </ItemVariantProvider>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

QuickView.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    product: PropTypes.shape({
        image: PropTypes.shape({
            alt: PropTypes.string,
            disBaseLink: PropTypes.string,
            link: PropTypes.string
        }),
        price: PropTypes.number,
        productId: PropTypes.string,
        productName: PropTypes.string,
        currency: PropTypes.string
    }).isRequired,
    onFavouriteToggle: PropTypes.func,
    isFavourite: PropTypes.bool
};

export default QuickView;
